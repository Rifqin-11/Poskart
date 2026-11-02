create table if not exists public.payout_account_change_otps (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  payload_hash text not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  last_sent_at timestamptz not null default now(),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists payout_account_change_otps_pending_idx
  on public.payout_account_change_otps (organization_id, requested_by)
  where consumed_at is null;

alter table public.payout_account_change_otps enable row level security;
revoke all on public.payout_account_change_otps from public, anon, authenticated;
grant all on public.payout_account_change_otps to service_role;

create table if not exists public.payout_account_change_otp_limits (
  organization_id text not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  sent_count smallint not null default 0 check (sent_count between 0 and 5),
  last_sent_at timestamptz,
  primary key (organization_id, requested_by)
);

alter table public.payout_account_change_otp_limits enable row level security;
revoke all on public.payout_account_change_otp_limits from public, anon, authenticated;
grant all on public.payout_account_change_otp_limits to service_role;

create or replace function public.take_payout_account_change_otp_slot(
  p_organization_id text,
  p_requested_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit public.payout_account_change_otp_limits%rowtype;
  v_retry_after integer;
begin
  insert into public.payout_account_change_otp_limits (
    organization_id,
    requested_by
  ) values (
    p_organization_id,
    p_requested_by
  )
  on conflict (organization_id, requested_by) do nothing;

  select *
    into v_limit
  from public.payout_account_change_otp_limits
  where organization_id = p_organization_id
    and requested_by = p_requested_by
  for update;

  if v_limit.last_sent_at is not null
    and v_limit.last_sent_at > now() - interval '60 seconds' then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (v_limit.last_sent_at + interval '60 seconds' - now())))::integer
    );
    return jsonb_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  if v_limit.window_started_at <= now() - interval '1 hour' then
    update public.payout_account_change_otp_limits
      set window_started_at = now(), sent_count = 0
    where organization_id = p_organization_id
      and requested_by = p_requested_by;
    v_limit.sent_count := 0;
    v_limit.window_started_at := now();
  end if;

  if v_limit.sent_count >= 5 then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (v_limit.window_started_at + interval '1 hour' - now())))::integer
    );
    return jsonb_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  update public.payout_account_change_otp_limits
    set sent_count = sent_count + 1,
        last_sent_at = now()
  where organization_id = p_organization_id
    and requested_by = p_requested_by;

  return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

-- Account details must not be editable directly through the Supabase client.
-- Saving is only allowed through the OTP-verifying service-role function below.
drop policy if exists "Organization managers can manage payout accounts"
  on public.organization_payout_accounts;
revoke all on public.organization_payout_accounts
  from public, anon, authenticated;
grant select on public.organization_payout_accounts to authenticated;
grant all on public.organization_payout_accounts to service_role;

create or replace function public.issue_payout_account_change_otp(
  p_challenge_id uuid,
  p_organization_id text,
  p_requested_by uuid,
  p_owner_profile_id uuid,
  p_code_hash text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_last_sent_at timestamptz;
  v_expires_at timestamptz;
  v_retry_after integer;
begin
  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and profile_id = p_requested_by
      and role in ('owner', 'admin')
  ) or not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and profile_id = p_owner_profile_id
      and role = 'owner'
  ) then
    raise exception 'Payout account OTP request is not authorized';
  end if;

  delete from public.payout_account_change_otps
  where organization_id = p_organization_id
    and requested_by = p_requested_by
    and (consumed_at is not null or expires_at <= now());

  insert into public.payout_account_change_otps (
    id,
    organization_id,
    requested_by,
    owner_profile_id,
    code_hash,
    payload_hash,
    expires_at,
    last_sent_at
  ) values (
    p_challenge_id,
    p_organization_id,
    p_requested_by,
    p_owner_profile_id,
    p_code_hash,
    p_payload_hash,
    now() + interval '5 minutes',
    now()
  )
  on conflict (organization_id, requested_by) where consumed_at is null
  do update set
    id = excluded.id,
    owner_profile_id = excluded.owner_profile_id,
    code_hash = excluded.code_hash,
    payload_hash = excluded.payload_hash,
    attempts = 0,
    expires_at = now() + interval '5 minutes',
    last_sent_at = now(),
    created_at = now()
  where public.payout_account_change_otps.last_sent_at <= now() - interval '60 seconds'
     or public.payout_account_change_otps.expires_at <= now()
  returning id, last_sent_at, expires_at
    into v_id, v_last_sent_at, v_expires_at;

  if v_id is not null then
    return jsonb_build_object(
      'sent', true,
      'challenge_id', v_id,
      'expires_at', v_expires_at
    );
  end if;

  select id, last_sent_at
    into v_id, v_last_sent_at
  from public.payout_account_change_otps
  where organization_id = p_organization_id
    and requested_by = p_requested_by
    and consumed_at is null
  limit 1;

  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (v_last_sent_at + interval '60 seconds' - now())))::integer
  );
  return jsonb_build_object(
    'sent', false,
    'challenge_id', v_id,
    'retry_after_seconds', v_retry_after
  );
end;
$$;

create or replace function public.verify_and_save_payout_account_change(
  p_challenge_id uuid,
  p_organization_id text,
  p_requested_by uuid,
  p_owner_profile_id uuid,
  p_code_hash text,
  p_payload_hash text,
  p_bank_name text,
  p_account_number text,
  p_account_holder_name text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_challenge public.payout_account_change_otps%rowtype;
  v_current_owner uuid;
  v_requester_role text;
  v_account_id uuid;
begin
  select role
    into v_requester_role
  from public.organization_members
  where organization_id = p_organization_id
    and profile_id = p_requested_by
  limit 1
  for share;

  if coalesce(v_requester_role, '') not in ('owner', 'admin') then
    return 'unauthorized';
  end if;

  select profile_id
    into v_current_owner
  from public.organization_members
  where organization_id = p_organization_id
    and role = 'owner'
  order by created_at asc
  limit 1
  for share;

  if v_current_owner is null or v_current_owner <> p_owner_profile_id then
    return 'owner_changed';
  end if;

  perform 1
  from public.organizations
  where id = p_organization_id
  for update;
  if not found then
    return 'invalid_or_used';
  end if;

  select *
    into v_challenge
  from public.payout_account_change_otps
  where id = p_challenge_id
    and organization_id = p_organization_id
    and requested_by = p_requested_by
  for update;

  if not found or v_challenge.consumed_at is not null then
    return 'invalid_or_used';
  end if;

  if v_challenge.expires_at <= now() then
    update public.payout_account_change_otps
      set consumed_at = now()
    where id = p_challenge_id;
    return 'expired';
  end if;

  if v_challenge.attempts >= 5 then
    update public.payout_account_change_otps
      set consumed_at = now()
    where id = p_challenge_id;
    return 'too_many_attempts';
  end if;

  if v_challenge.owner_profile_id <> p_owner_profile_id then
    update public.payout_account_change_otps
      set consumed_at = now()
    where id = p_challenge_id;
    return 'owner_changed';
  end if;

  if v_challenge.payload_hash <> p_payload_hash then
    update public.payout_account_change_otps
      set consumed_at = now()
    where id = p_challenge_id;
    return 'details_changed';
  end if;

  if v_challenge.code_hash <> p_code_hash then
    update public.payout_account_change_otps
      set attempts = attempts + 1,
          consumed_at = case when attempts + 1 >= 5 then now() else null end
    where id = p_challenge_id;
    if v_challenge.attempts + 1 >= 5 then
      return 'too_many_attempts';
    end if;
    return 'invalid_code';
  end if;

  if nullif(trim(coalesce(p_bank_name, '')), '') is null
    or nullif(trim(coalesce(p_account_number, '')), '') is null
    or nullif(trim(coalesce(p_account_holder_name, '')), '') is null then
    return 'invalid_details';
  end if;

  select id
    into v_account_id
  from public.organization_payout_accounts
  where organization_id = p_organization_id
  order by is_default desc, updated_at desc
  limit 1
  for update;

  update public.payout_account_change_otps
    set consumed_at = now()
  where id = p_challenge_id;

  update public.organization_payout_accounts
    set is_default = false,
        updated_at = now()
  where organization_id = p_organization_id;

  if v_account_id is null then
    insert into public.organization_payout_accounts (
      organization_id,
      bank_name,
      account_number,
      account_holder_name,
      is_default,
      updated_at
    ) values (
      p_organization_id,
      trim(p_bank_name),
      trim(p_account_number),
      trim(p_account_holder_name),
      true,
      now()
    );
  else
    update public.organization_payout_accounts
      set bank_name = trim(p_bank_name),
          account_number = trim(p_account_number),
          account_holder_name = trim(p_account_holder_name),
          is_default = true,
          updated_at = now()
    where id = v_account_id
      and organization_id = p_organization_id;
  end if;

  return 'saved';
end;
$$;

revoke all on function public.issue_payout_account_change_otp(uuid, text, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.take_payout_account_change_otp_slot(text, uuid)
  from public, anon, authenticated;
revoke all on function public.verify_and_save_payout_account_change(uuid, text, uuid, uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.issue_payout_account_change_otp(uuid, text, uuid, uuid, text, text)
  to service_role;
grant execute on function public.take_payout_account_change_otp_slot(text, uuid)
  to service_role;
grant execute on function public.verify_and_save_payout_account_change(uuid, text, uuid, uuid, text, text, text, text, text)
  to service_role;
