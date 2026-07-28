create table if not exists public.device_error_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references public.organizations(id) on delete cascade,
  device_id text not null
    references public.devices(id) on delete cascade,
  fingerprint text not null,
  category text not null default 'runtime'
    check (
      category in (
        'startup',
        'runtime',
        'payment',
        'camera',
        'printer',
        'upload',
        'sync',
        'unknown'
      )
    ),
  severity text not null default 'error'
    check (severity in ('warning', 'error', 'fatal')),
  message text not null,
  stack_trace text,
  context jsonb not null default '{}'::jsonb,
  app_version text,
  occurrence_count integer not null default 1
    check (occurrence_count > 0),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, fingerprint)
);

create index if not exists device_error_groups_org_open_idx
  on public.device_error_groups (organization_id, last_seen desc)
  where resolved_at is null;

create index if not exists device_error_groups_device_seen_idx
  on public.device_error_groups (device_id, last_seen desc);

alter table public.device_error_groups enable row level security;

drop policy if exists "Organization members can view device errors"
  on public.device_error_groups;
create policy "Organization members can view device errors"
  on public.device_error_groups for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

drop policy if exists "Organization members can create device errors"
  on public.device_error_groups;
create policy "Organization members can create device errors"
  on public.device_error_groups for insert to authenticated
  with check (
    exists (
      select 1
      from public.devices d
      where d.id = device_error_groups.device_id
        and d.organization_id = device_error_groups.organization_id
    )
    and (
      public.is_auth_admin()
      or organization_id in (
        select organization_id
        from public.organization_members
        where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "Organization admins can update device errors"
  on public.device_error_groups;
create policy "Organization admins can update device errors"
  on public.device_error_groups for update to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
        and role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.devices d
      where d.id = device_error_groups.device_id
        and d.organization_id = device_error_groups.organization_id
    )
    and (
      public.is_auth_admin()
      or organization_id in (
        select organization_id
        from public.organization_members
        where profile_id = auth.uid()
          and role in ('owner', 'admin')
      )
    )
  );

grant select, insert, update on public.device_error_groups to authenticated;

create or replace function public.record_device_error_batch(
  p_organization_id text,
  p_device_id text,
  p_errors jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_error jsonb;
  v_recorded integer := 0;
  v_first_occurred_at timestamptz;
  v_last_occurred_at timestamptz;
  v_count integer;
begin
  if jsonb_typeof(p_errors) <> 'array' then
    raise exception 'Device errors must be an array';
  end if;

  if not exists (
    select 1
    from public.devices d
    where d.id = p_device_id
      and d.organization_id = p_organization_id
  ) then
    raise exception 'Device does not belong to organization';
  end if;

  for v_error in
    select value
    from jsonb_array_elements(p_errors)
    limit 20
  loop
    v_count := greatest(
      1,
      least(1000, coalesce((v_error ->> 'occurrenceCount')::integer, 1))
    );
    v_last_occurred_at := coalesce(
      nullif(v_error ->> 'lastOccurredAt', '')::timestamptz,
      now()
    );
    v_first_occurred_at := least(
      coalesce(
        nullif(v_error ->> 'firstOccurredAt', '')::timestamptz,
        v_last_occurred_at
      ),
      v_last_occurred_at
    );

    insert into public.device_error_groups (
      organization_id,
      device_id,
      fingerprint,
      category,
      severity,
      message,
      stack_trace,
      context,
      app_version,
      occurrence_count,
      first_seen,
      last_seen,
      resolved_at,
      resolved_by,
      updated_at
    ) values (
      p_organization_id,
      p_device_id,
      left(v_error ->> 'fingerprint', 160),
      coalesce(nullif(v_error ->> 'category', ''), 'runtime'),
      coalesce(nullif(v_error ->> 'severity', ''), 'error'),
      left(coalesce(v_error ->> 'message', 'Unknown device error'), 2000),
      nullif(left(coalesce(v_error ->> 'stackTrace', ''), 12000), ''),
      coalesce(v_error -> 'context', '{}'::jsonb),
      nullif(left(coalesce(v_error ->> 'appVersion', ''), 120), ''),
      v_count,
      v_first_occurred_at,
      v_last_occurred_at,
      null,
      null,
      now()
    )
    on conflict (device_id, fingerprint)
    do update set
      category = excluded.category,
      severity = excluded.severity,
      message = excluded.message,
      stack_trace = excluded.stack_trace,
      context = excluded.context,
      app_version = excluded.app_version,
      occurrence_count =
        public.device_error_groups.occurrence_count + excluded.occurrence_count,
      first_seen = least(
        public.device_error_groups.first_seen,
        excluded.first_seen
      ),
      last_seen = greatest(
        public.device_error_groups.last_seen,
        excluded.last_seen
      ),
      resolved_at = null,
      resolved_by = null,
      updated_at = now();

    v_recorded := v_recorded + 1;
  end loop;

  return v_recorded;
end;
$$;

revoke all on function public.record_device_error_batch(text, text, jsonb)
  from public;
grant execute on function public.record_device_error_batch(text, text, jsonb)
  to authenticated;

create or replace function public.get_device_error_open_counts()
returns table (
  device_id text,
  open_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    errors.device_id,
    count(*) as open_count
  from public.device_error_groups errors
  where errors.resolved_at is null
  group by errors.device_id
$$;

revoke all on function public.get_device_error_open_counts() from public;
grant execute on function public.get_device_error_open_counts()
  to authenticated;
