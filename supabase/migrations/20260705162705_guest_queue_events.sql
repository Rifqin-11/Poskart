create table if not exists public.queue_events (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  device_id text references public.devices(id) on delete set null,
  name text not null,
  description text,
  public_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'active'
    check (status in ('active', 'paused', 'closed', 'deleted')),
  starts_at timestamptz,
  ends_at timestamptz,
  last_queue_number integer not null default 0 check (last_queue_number >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint queue_events_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.guest_queue_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  queue_event_id uuid not null references public.queue_events(id) on delete cascade,
  queue_number integer not null check (queue_number > 0),
  public_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  visitor_name text not null,
  visitor_email text not null,
  visitor_phone text not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'in_session', 'done', 'cancelled', 'no_show')),
  called_at timestamptz,
  in_session_at timestamptz,
  completed_at timestamptz,
  notified_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_queue_entries_unique_number unique (queue_event_id, queue_number),
  constraint guest_queue_entries_name_not_blank check (length(trim(visitor_name)) > 0),
  constraint guest_queue_entries_email_not_blank check (length(trim(visitor_email)) > 0),
  constraint guest_queue_entries_phone_not_blank check (length(trim(visitor_phone)) > 0)
);

create index if not exists queue_events_org_status_idx
  on public.queue_events (organization_id, status, created_at desc);

create index if not exists guest_queue_entries_event_status_idx
  on public.guest_queue_entries (queue_event_id, status, queue_number);

create index if not exists guest_queue_entries_org_created_idx
  on public.guest_queue_entries (organization_id, created_at desc);

revoke all on public.queue_events from anon;
revoke all on public.guest_queue_entries from anon;

grant select, insert, update on public.queue_events to authenticated;
grant select, insert, update on public.guest_queue_entries to authenticated;
grant select, insert, update, delete on public.queue_events to service_role;
grant select, insert, update, delete on public.guest_queue_entries to service_role;

alter table public.queue_events enable row level security;
alter table public.guest_queue_entries enable row level security;

drop policy if exists "Users can view organization queue events" on public.queue_events;
create policy "Users can view organization queue events"
  on public.queue_events
  for select
  to authenticated
  using (
    public.queue_events.organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

drop policy if exists "Managers can create organization queue events" on public.queue_events;
create policy "Managers can create organization queue events"
  on public.queue_events
  for insert
  to authenticated
  with check (
    public.queue_events.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

drop policy if exists "Managers can update organization queue events" on public.queue_events;
create policy "Managers can update organization queue events"
  on public.queue_events
  for update
  to authenticated
  using (
    public.queue_events.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  )
  with check (
    public.queue_events.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

drop policy if exists "Users can view organization queue entries" on public.guest_queue_entries;
create policy "Users can view organization queue entries"
  on public.guest_queue_entries
  for select
  to authenticated
  using (
    public.guest_queue_entries.organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

drop policy if exists "Managers can update organization queue entries" on public.guest_queue_entries;
create policy "Managers can update organization queue entries"
  on public.guest_queue_entries
  for update
  to authenticated
  using (
    public.guest_queue_entries.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  )
  with check (
    public.guest_queue_entries.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

create or replace function public.create_guest_queue_entry(
  p_event_token text,
  p_visitor_name text,
  p_visitor_email text,
  p_visitor_phone text
)
returns table (
  id uuid,
  queue_event_id uuid,
  organization_id text,
  queue_number integer,
  public_token text,
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event public.queue_events%rowtype;
  next_number integer;
  normalized_name text;
  normalized_email text;
  normalized_phone text;
  inserted_entry public.guest_queue_entries%rowtype;
begin
  normalized_name := nullif(trim(coalesce(p_visitor_name, '')), '');
  normalized_email := lower(nullif(trim(coalesce(p_visitor_email, '')), ''));
  normalized_phone := nullif(trim(coalesce(p_visitor_phone, '')), '');

  if normalized_name is null then
    raise exception 'Visitor name is required';
  end if;
  if normalized_email is null or normalized_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid visitor email is required';
  end if;
  if normalized_phone is null or length(regexp_replace(normalized_phone, '[^0-9+]', '', 'g')) < 8 then
    raise exception 'Valid visitor phone is required';
  end if;

  select qe.*
    into selected_event
  from public.queue_events as qe
  where qe.public_token = p_event_token
    and qe.status = 'active'
    and qe.deleted_at is null
    and (qe.starts_at is null or qe.starts_at <= now())
    and (qe.ends_at is null or qe.ends_at >= now())
  for update;

  if selected_event.id is null then
    raise exception 'Queue event is not available';
  end if;

  next_number := selected_event.last_queue_number + 1;

  update public.queue_events as qe
  set last_queue_number = next_number,
      updated_at = now()
  where qe.id = selected_event.id;

  insert into public.guest_queue_entries (
    organization_id,
    queue_event_id,
    queue_number,
    visitor_name,
    visitor_email,
    visitor_phone
  )
  values (
    selected_event.organization_id,
    selected_event.id,
    next_number,
    normalized_name,
    normalized_email,
    normalized_phone
  )
  returning * into inserted_entry;

  return query
  select
    inserted_entry.id,
    inserted_entry.queue_event_id,
    inserted_entry.organization_id,
    inserted_entry.queue_number,
    inserted_entry.public_token,
    inserted_entry.visitor_name,
    inserted_entry.visitor_email,
    inserted_entry.visitor_phone,
    inserted_entry.created_at;
end;
$$;

revoke execute on function public.create_guest_queue_entry(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_guest_queue_entry(text, text, text, text) to service_role;

notify pgrst, 'reload schema';
