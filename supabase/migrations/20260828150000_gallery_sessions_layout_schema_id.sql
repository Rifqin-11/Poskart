-- Keep a gallery session attached to the layout theme selected by the verified
-- kiosk device. The layout row remains live so branding changes apply to old
-- sessions without rewriting historical gallery data.
alter table public.gallery_sessions
  add column if not exists layout_schema_id text
    references public.layout_schemas(id) on delete set null;

create index if not exists gallery_sessions_layout_schema_id_idx
  on public.gallery_sessions (layout_schema_id)
  where layout_schema_id is not null;

-- Existing sessions already carry the verified device id. Populate the new
-- binding where possible so legacy links immediately resolve theme branding.
update public.gallery_sessions as session
set layout_schema_id = device.layout_schema_id
from public.devices as device
where session.layout_schema_id is null
  and session.device_id = device.id
  and session.organization_id = device.organization_id
  and device.layout_schema_id is not null;

create or replace function public.bind_gallery_session_layout_schema_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_layout_schema_id text;
begin
  if new.device_id is null then
    if tg_op = 'INSERT' then
      new.layout_schema_id := null;
    else
      new.layout_schema_id := old.layout_schema_id;
    end if;
    return new;
  end if;

  select d.layout_schema_id
  into verified_layout_schema_id
  from public.devices as d
  where d.id = new.device_id
    and d.organization_id = new.organization_id;

  -- The device row is the authority. This also prevents a service-role RPC
  -- caller from binding a session to a different organization's theme. Keep
  -- an existing binding when a legacy device has no assigned layout.
  if verified_layout_schema_id is not null then
    new.layout_schema_id := verified_layout_schema_id;
  elsif tg_op = 'UPDATE' then
    new.layout_schema_id := old.layout_schema_id;
  end if;
  return new;
end;
$$;

drop trigger if exists gallery_sessions_bind_layout_schema_id
  on public.gallery_sessions;

create trigger gallery_sessions_bind_layout_schema_id
  before insert or update of device_id, organization_id, layout_schema_id
  on public.gallery_sessions
  for each row
  execute function public.bind_gallery_session_layout_schema_id();
