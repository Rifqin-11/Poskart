-- A gateway callback and a manual status check must activate an order only once.
alter table public.subscription_orders
  add column if not exists gateway_status_checked_at timestamptz,
  add column if not exists gateway_status_check_started_at timestamptz,
  add column if not exists subscription_activated_at timestamptz;

create index if not exists subscription_orders_organization_created_idx
  on public.subscription_orders (organization_id, created_at desc);

create or replace function public.reconcile_subscription_payment(
  p_merchant_order_id text,
  p_status text,
  p_reference text,
  p_payment_method text,
  p_gateway_response jsonb,
  p_checked_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
set timezone = 'UTC'
as $$
declare
  v_order public.subscription_orders%rowtype;
  v_organization_id text;
  v_current_end timestamptz;
  v_now timestamptz := now();
begin
  if p_status is null or p_status not in ('pending', 'paid', 'failed', 'cancelled') then
    raise exception 'Invalid subscription payment status';
  end if;

  select * into v_order from public.subscription_orders
  where merchant_order_id = p_merchant_order_id for update;
  if not found then
    raise exception 'Subscription order not found';
  end if;

  -- Also preserves previously paid orders processed by the legacy callbacks.
  if v_order.status = 'paid' then return; end if;

  if p_status = 'paid' then
    v_organization_id := v_order.organization_id;
    if v_organization_id is null then
      select m.organization_id into v_organization_id
      from public.organization_members m
      join public.profiles p on p.id = m.profile_id
      where (v_order.profile_id is not null and p.id = v_order.profile_id)
         or (v_order.profile_id is null and p.email = v_order.email)
      limit 1;
    end if;
    if v_organization_id is null then
      raise exception 'No organization found for paid subscription order';
    end if;

    -- Serialize separate paid orders for the same organization, even when its
    -- subscription does not exist yet. Both durations must be retained.
    perform pg_advisory_xact_lock(hashtextextended('subscription:' || v_organization_id, 0));
    select current_period_end into v_current_end
    from public.subscriptions where organization_id = v_organization_id for update;

    insert into public.subscriptions (
      organization_id, plan_id, status, current_period_end, device_limit, updated_at
    ) values (
      v_organization_id, v_order.plan_id, 'active',
      greatest(coalesce(v_current_end, v_now), v_now)
        + make_interval(months => greatest(1, v_order.duration_months)),
      greatest(1, v_order.device_count), v_now
    ) on conflict (organization_id) do update set
      plan_id = excluded.plan_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      device_limit = excluded.device_limit,
      updated_at = excluded.updated_at;

    delete from public.admin_notifications
    where organization_id = v_organization_id and type = 'subscription_expiry_reminder';
  end if;

  update public.subscription_orders set
    -- An old pending notification cannot reopen a failed/cancelled order.
    status = case when p_status = 'pending' and v_order.status <> 'pending'
      then v_order.status else p_status end,
    payment_reference = coalesce(p_reference, payment_reference),
    payment_method = coalesce(p_payment_method, payment_method),
    gateway_response = p_gateway_response,
    gateway_status_checked_at = p_checked_at,
    subscription_activated_at = case when p_status = 'paid' then v_now else subscription_activated_at end,
    updated_at = v_now
  where id = v_order.id;
  -- Subscription activation and the paid transition commit or roll back together.
end;
$$;

revoke all on function public.reconcile_subscription_payment(text, text, text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reconcile_subscription_payment(text, text, text, text, jsonb, timestamptz)
  to service_role;
