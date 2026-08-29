-- Organization feature toggles are controlled by the organization owner/admin,
-- not by the Superadmin subscription editor.
create or replace function public.admin_save_organization(
  p_organization_id text,
  p_organization jsonb,
  p_subscription jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(p_organization ->> 'name'), '');
  v_status text := coalesce(p_organization ->> 'status', 'active');
  v_renewal_date date := nullif(p_organization ->> 'renewal_date', '')::date;
  v_payment_collection_mode text := coalesce(
    p_organization ->> 'payment_collection_mode',
    'platform'
  );
  v_features jsonb := jsonb_set(
    coalesce(p_organization -> 'features', '{}'::jsonb),
    '{money}',
    'true'::jsonb,
    true
  );
  v_plan_id text := coalesce(nullif(p_subscription ->> 'plan_id', ''), 'free');
  v_plan_name text;
  v_subscription_status text := coalesce(
    nullif(p_subscription ->> 'status', ''),
    'free'
  );
  v_current_period_end timestamptz;
  v_device_limit integer := greatest(
    1,
    coalesce((p_subscription ->> 'device_limit')::integer, 1)
  );
  v_device_count integer;
  v_organization_exists boolean;
begin
  if not public.is_auth_admin() then
    raise exception 'Super admin access required';
  end if;

  if p_organization_id is null or v_name is null then
    raise exception 'Organization name is required';
  end if;

  if v_status not in ('active', 'trial', 'paused') then
    raise exception 'Invalid organization status';
  end if;

  if v_renewal_date is null then
    raise exception 'Organization renewal date is required';
  end if;

  if v_payment_collection_mode not in ('platform', 'custom') then
    raise exception 'Invalid payment collection mode';
  end if;

  select name
  into v_plan_name
  from public.subscription_plans
  where id = v_plan_id;

  if v_plan_name is null then
    raise exception 'Subscription plan does not exist';
  end if;

  if v_plan_id = 'free' then
    if v_subscription_status <> 'free' then
      raise exception 'Free Account must use Free subscription status';
    end if;
    v_current_period_end := null;
  else
    if v_subscription_status not in ('active', 'trialing', 'past_due', 'canceled') then
      raise exception 'Invalid paid subscription status';
    end if;

    if p_subscription ->> 'current_period_end' is not null
       and p_subscription ->> 'current_period_end' <> '' then
      v_current_period_end := (p_subscription ->> 'current_period_end')::timestamptz;
    end if;

    if v_subscription_status in ('active', 'trialing')
       and (v_current_period_end is null or v_current_period_end <= now()) then
      raise exception 'Active or trialing subscriptions require a future expiry date';
    end if;
  end if;

  select count(*)::integer
  into v_device_count
  from public.devices
  where organization_id = p_organization_id;

  if v_device_count > v_device_limit then
    raise exception 'Device limit cannot be lower than existing devices';
  end if;

  select exists (
    select 1 from public.organizations where id = p_organization_id
  ) into v_organization_exists;

  if v_organization_exists then
    -- Do not overwrite owner-managed feature flags from an old Superadmin form
    -- snapshot while changing subscription metadata.
    update public.organizations
    set
      name = v_name,
      status = v_status,
      renewal_date = v_renewal_date,
      payment_collection_mode = v_payment_collection_mode,
      updated_at = now()
    where id = p_organization_id;
  else
    insert into public.organizations (
      id,
      name,
      plan,
      status,
      booths,
      users,
      renewal_date,
      join_code,
      features,
      payment_collection_mode,
      updated_at
    ) values (
      p_organization_id,
      v_name,
      v_plan_name,
      v_status,
      0,
      0,
      v_renewal_date,
      public.generate_organization_join_code(),
      v_features,
      v_payment_collection_mode,
      now()
    );
  end if;

  insert into public.subscriptions (
    organization_id,
    plan_id,
    status,
    current_period_end,
    device_limit,
    updated_at
  ) values (
    p_organization_id,
    v_plan_id,
    v_subscription_status,
    v_current_period_end,
    v_device_limit,
    now()
  )
  on conflict (organization_id) do update set
    plan_id = excluded.plan_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    device_limit = excluded.device_limit,
    updated_at = now();
end;
$$;

revoke all on function public.admin_save_organization(text, jsonb, jsonb)
  from public, anon;
grant execute on function public.admin_save_organization(text, jsonb, jsonb)
  to authenticated, service_role;
