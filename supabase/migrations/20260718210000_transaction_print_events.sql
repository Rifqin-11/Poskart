create table if not exists public.transaction_print_events (
  event_id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  transaction_id text not null references public.transactions(id) on delete cascade,
  device_id text references public.devices(id) on delete set null,
  copies integer not null check (copies between 1 and 20),
  source text not null default 'kiosk_reprint',
  created_at timestamptz not null default now()
);

create index if not exists transaction_print_events_org_created_idx
  on public.transaction_print_events (organization_id, created_at desc);

alter table public.transaction_print_events enable row level security;

drop policy if exists "Organization members can view print events"
  on public.transaction_print_events;
create policy "Organization members can view print events"
  on public.transaction_print_events
  for select
  using (
    public.is_auth_admin()
    or organization_id = public.get_auth_organization_id()
  );

create or replace function public.record_transaction_additional_print(
  p_event_id text,
  p_organization_id text,
  p_transaction_id text,
  p_device_id text,
  p_copies integer,
  p_source text default 'kiosk_reprint'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  inserted_event boolean := false;
begin
  if not public.is_auth_admin()
    and p_organization_id <> public.get_auth_organization_id() then
    raise exception 'Unauthorized organization';
  end if;

  if nullif(trim(p_event_id), '') is null
    or nullif(trim(p_transaction_id), '') is null
    or p_copies < 1
    or p_copies > 20 then
    raise exception 'Invalid print event';
  end if;

  if p_device_id is not null and not exists (
    select 1
    from public.devices device
    where device.id = p_device_id
      and device.organization_id = p_organization_id
  ) then
    raise exception 'Invalid print device';
  end if;

  insert into public.transaction_print_events (
    event_id,
    organization_id,
    transaction_id,
    device_id,
    copies,
    source
  )
  select
    trim(p_event_id),
    p_organization_id,
    t.id,
    p_device_id,
    p_copies,
    coalesce(nullif(trim(p_source), ''), 'kiosk_reprint')
  from public.transactions t
  where t.id = p_transaction_id
    and t.organization_id = p_organization_id
  on conflict (event_id) do nothing;

  get diagnostics inserted_count = row_count;
  inserted_event := inserted_count > 0;

  if inserted_event then
    update public.transactions
    set
      print_count = greatest(0, coalesce(print_count, 0)) + p_copies,
      updated_at = now()
    where id = p_transaction_id
      and organization_id = p_organization_id;
  end if;

  return inserted_event;
end;
$$;

revoke all on function public.record_transaction_additional_print(
  text, text, text, text, integer, text
) from public;
grant execute on function public.record_transaction_additional_print(
  text, text, text, text, integer, text
) to authenticated;

grant select on public.transaction_print_events to authenticated;
