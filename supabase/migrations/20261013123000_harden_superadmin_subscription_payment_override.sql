-- Keep audit history when an admin profile is removed. The immutable profile
-- id remains useful for historical attribution without blocking profile cleanup.
alter table public.subscription_payment_overrides
  drop constraint if exists subscription_payment_overrides_admin_profile_id_fkey;

create or replace function public.admin_override_subscription_payment(
  p_order_id uuid,
  p_status text,
  p_reason text,
  p_admin_profile_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
set timezone = 'UTC'
as $$
declare
  v_order public.subscription_orders%rowtype;
  v_previous_status text;
  v_now timestamptz := now();
begin
  if p_status is null or p_status not in ('paid', 'failed') then
    raise exception 'Manual subscription payment status must be paid or failed';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'A manual override reason of at least 10 characters is required';
  end if;

  if p_admin_profile_id is null or not exists (
    select 1 from public.profiles
    where id = p_admin_profile_id and role = 'admin'
  ) then
    raise exception 'A super admin profile is required';
  end if;

  select * into v_order
  from public.subscription_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Subscription order not found';
  end if;

  v_previous_status := v_order.status;

  if v_order.status = 'paid' and p_status = 'failed' then
    raise exception 'A paid subscription order cannot be marked as failed';
  end if;

  if p_status = 'paid' then
    perform public.reconcile_subscription_payment(
      v_order.merchant_order_id,
      'paid',
      null,
      'manual_override',
      jsonb_build_object(
        'source', 'superadmin_override',
        'reason', btrim(p_reason),
        'admin_profile_id', p_admin_profile_id
      ),
      v_now
    );
  else
    update public.subscription_orders
    set status = 'failed',
        payment_closed_reason = null,
        payment_method = 'manual_override',
        gateway_status_checked_at = v_now,
        gateway_response = jsonb_build_object(
          'source', 'superadmin_override',
          'reason', btrim(p_reason),
          'admin_profile_id', p_admin_profile_id
        ),
        updated_at = v_now
    where id = v_order.id;
  end if;

  select * into v_order
  from public.subscription_orders
  where id = p_order_id;

  insert into public.subscription_payment_overrides (
    subscription_order_id,
    merchant_order_id,
    organization_id,
    admin_profile_id,
    previous_status,
    next_status,
    reason,
    created_at
  ) values (
    v_order.id,
    v_order.merchant_order_id,
    v_order.organization_id,
    p_admin_profile_id,
    v_previous_status,
    p_status,
    btrim(p_reason),
    v_now
  );

  return jsonb_build_object(
    'id', v_order.id,
    'merchant_order_id', v_order.merchant_order_id,
    'status', v_order.status,
    'previous_status', v_previous_status
  );
end;
$$;

revoke all on function public.admin_override_subscription_payment(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_override_subscription_payment(uuid, text, text, uuid)
  to service_role;
