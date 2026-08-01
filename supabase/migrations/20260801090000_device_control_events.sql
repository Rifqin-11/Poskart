-- Persistent control events let a kiosk receive revocation and runtime
-- notifications through Supabase Realtime without polling every few seconds.
-- Events are intentionally kept separate from devices because a revoked device
-- is deleted as part of the same transaction.

create table if not exists public.device_control_events (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references public.organizations(id) on delete cascade,
  device_id text not null,
  event_type text not null
    check (event_type in ('revoked')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists device_control_events_device_created_idx
  on public.device_control_events (device_id, created_at desc);

alter table public.device_control_events enable row level security;

drop policy if exists "Organization members can view device control events"
  on public.device_control_events;
create policy "Organization members can view device control events"
  on public.device_control_events for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

grant select on public.device_control_events to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'device_control_events'
    ) then
    alter publication supabase_realtime add table public.device_control_events;
  end if;
end
$$;

-- Allows the Flutter listener to distinguish configuration changes from the
-- kiosk's own heartbeat/status updates without triggering a sync loop.
alter table public.devices replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'devices'
    ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end
$$;

-- The dashboard calls this function after its normal owner/admin check. The
-- event insert and device deletion are atomic, so a Realtime subscriber cannot
-- observe a deleted device without also receiving its revoke event.
create or replace function public.revoke_device_with_event(
  p_device_id text,
  p_organization_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.devices
    where id = p_device_id
      and organization_id = p_organization_id
  ) then
    raise exception 'Device was not found in this organization.';
  end if;

  insert into public.device_control_events (
    organization_id,
    device_id,
    event_type,
    payload
  ) values (
    p_organization_id,
    p_device_id,
    'revoked',
    jsonb_build_object('reason', 'deleted_by_admin')
  );

  delete from public.devices
  where id = p_device_id
    and organization_id = p_organization_id;
end;
$$;

revoke all on function public.revoke_device_with_event(text, text)
  from public, anon, authenticated;
grant execute on function public.revoke_device_with_event(text, text)
  to service_role;
