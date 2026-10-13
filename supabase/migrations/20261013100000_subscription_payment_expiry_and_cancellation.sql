alter table public.subscription_orders
  add column if not exists payment_expires_at timestamptz,
  add column if not exists payment_closed_reason text check (payment_closed_reason in ('expired', 'user_cancelled')),
  add column if not exists payment_cancelled_at timestamptz,
  add column if not exists gateway_cancelled_at timestamptz;

update public.subscription_orders
set payment_expires_at = created_at + interval '15 minutes'
where payment_expires_at is null;

alter table public.subscription_orders
  alter column payment_expires_at set default (now() + interval '15 minutes'),
  alter column payment_expires_at set not null;

-- Close stale pending orders without deleting financial history. A verified
-- paid callback may still activate these orders if confirmation arrives late.
update public.subscription_orders
set status = 'failed', payment_closed_reason = 'expired', updated_at = now()
where status = 'pending' and payment_expires_at <= now();

create index if not exists subscription_orders_pending_expiry_idx
  on public.subscription_orders (organization_id, payment_expires_at)
  where status = 'pending';

create or replace function public.expire_subscription_payments(p_organization_id text)
returns void language sql security definer set search_path = public as $$
  update public.subscription_orders
  set status = 'failed', payment_closed_reason = 'expired', updated_at = now()
  where organization_id = p_organization_id and status = 'pending'
    and payment_expires_at <= now();
$$;

create or replace function public.cancel_subscription_payment(
  p_merchant_order_id text, p_organization_id text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_order public.subscription_orders%rowtype;
begin
  select * into v_order from public.subscription_orders
  where merchant_order_id = p_merchant_order_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'Subscription order not found'; end if;
  -- Never overwrite a concurrent paid callback or a previously closed order.
  if v_order.status <> 'pending' then return; end if;
  if v_order.payment_expires_at <= now() then
    update public.subscription_orders set status = 'failed', payment_closed_reason = 'expired', updated_at = now()
    where id = v_order.id;
  else
    update public.subscription_orders set status = 'cancelled', payment_closed_reason = 'user_cancelled',
      payment_cancelled_at = now(), updated_at = now()
    where id = v_order.id;
  end if;
end;
$$;

create or replace function public.reconcile_subscription_payment(
  p_merchant_order_id text, p_status text, p_reference text,
  p_payment_method text, p_gateway_response jsonb, p_checked_at timestamptz
) returns void
language plpgsql security definer set search_path = public set timezone = 'UTC' as $$
declare
  v_order public.subscription_orders%rowtype;
  v_organization_id text;
  v_current_end timestamptz;
  v_next_status text;
  v_now timestamptz := now();
begin
  if p_status is null or p_status not in ('pending', 'paid', 'failed', 'cancelled') then
    raise exception 'Invalid subscription payment status';
  end if;
  select * into v_order from public.subscription_orders
  where merchant_order_id = p_merchant_order_id for update;
  if not found then raise exception 'Subscription order not found'; end if;
  if v_order.status = 'paid' then return; end if;

  if p_status = 'paid' then
    v_organization_id := v_order.organization_id;
    if v_organization_id is null then
      select m.organization_id into v_organization_id
      from public.organization_members m join public.profiles p on p.id = m.profile_id
      where (v_order.profile_id is not null and p.id = v_order.profile_id)
         or (v_order.profile_id is null and p.email = v_order.email)
      limit 1;
    end if;
    if v_organization_id is null then raise exception 'No organization found for paid subscription order'; end if;
    perform pg_advisory_xact_lock(hashtextextended('subscription:' || v_organization_id, 0));
    select current_period_end into v_current_end from public.subscriptions
    where organization_id = v_organization_id for update;
    insert into public.subscriptions (organization_id, plan_id, status, current_period_end, device_limit, updated_at)
    values (v_organization_id, v_order.plan_id, 'active',
      greatest(coalesce(v_current_end, v_now), v_now) + make_interval(months => greatest(1, v_order.duration_months)),
      greatest(1, v_order.device_count), v_now)
    on conflict (organization_id) do update set
      plan_id = excluded.plan_id, status = excluded.status, current_period_end = excluded.current_period_end,
      device_limit = excluded.device_limit, updated_at = excluded.updated_at;
    delete from public.admin_notifications
    where organization_id = v_organization_id and type = 'subscription_expiry_reminder';
  end if;

  v_next_status := case
    when p_status = 'paid' then 'paid'
    when v_order.status <> 'pending' then v_order.status
    when p_status = 'pending' and v_order.payment_expires_at <= v_now then 'failed'
    else p_status end;

  update public.subscription_orders set
    status = v_next_status,
    payment_closed_reason = case
      when v_next_status = 'paid' then null
      when v_order.status <> 'pending' then payment_closed_reason
      when v_next_status = 'cancelled' then 'user_cancelled'
      when v_next_status = 'failed' and v_order.payment_expires_at <= v_now then 'expired'
      else payment_closed_reason end,
    payment_cancelled_at = case when v_next_status = 'cancelled' then coalesce(payment_cancelled_at, v_now) else payment_cancelled_at end,
    gateway_cancelled_at = case when p_gateway_response->>'transaction_status' = 'cancel'
      then coalesce(gateway_cancelled_at, v_now) else gateway_cancelled_at end,
    payment_reference = coalesce(p_reference, payment_reference),
    payment_method = coalesce(p_payment_method, payment_method),
    gateway_response = p_gateway_response, gateway_status_checked_at = p_checked_at,
    subscription_activated_at = case when v_next_status = 'paid' then v_now else subscription_activated_at end,
    updated_at = v_now
  where id = v_order.id;
end;
$$;

revoke all on function public.expire_subscription_payments(text) from public, anon, authenticated;
revoke all on function public.cancel_subscription_payment(text, text) from public, anon, authenticated;
revoke all on function public.reconcile_subscription_payment(text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.expire_subscription_payments(text) to service_role;
grant execute on function public.cancel_subscription_payment(text, text) to service_role;
grant execute on function public.reconcile_subscription_payment(text, text, text, text, jsonb, timestamptz) to service_role;
