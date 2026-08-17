-- Bind gallery sessions to the template row itself instead of matching on the
-- template name at read time.
--
-- Frames can be renamed in the builder after a session was created. The old
-- name-based lookup silently stopped resolving, which broke features that read
-- frame configuration from the session (e.g. the result-page music player).
--
-- The id is resolved ONCE, at write time, by a trigger. Later renames only
-- change `templates.name`, so the stored `template_id` keeps pointing at the
-- same frame.

alter table public.gallery_sessions
  add column if not exists template_id text
    references public.templates(id) on delete set null;

create index if not exists gallery_sessions_template_id_idx
  on public.gallery_sessions (template_id)
  where template_id is not null;

-- Resolve template_name -> template_id for rows written by the kiosk.
--
-- Rules:
--   1. An id supplied explicitly by the API always wins.
--   2. On insert, or when template_name actually changes, try to resolve.
--   3. A failed lookup never clears an id that was already resolved, so a
--      later rename cannot orphan the session.
create or replace function public.resolve_gallery_session_template_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_id text;
begin
  -- An explicitly supplied id is authoritative.
  if tg_op = 'INSERT' and new.template_id is not null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.template_id is not null
     and new.template_id is distinct from old.template_id then
    return new;
  end if;

  -- Nothing to re-derive when the name did not move.
  if tg_op = 'UPDATE'
     and new.template_name is not distinct from old.template_name
     and new.organization_id is not distinct from old.organization_id
     and new.template_id is not null then
    return new;
  end if;

  if new.template_name is null or btrim(new.template_name) = '' then
    return new;
  end if;

  select t.id
  into resolved_id
  from public.templates as t
  where t.organization_id = new.organization_id
    and lower(btrim(t.name)) = lower(btrim(new.template_name))
  order by t.updated_at desc nulls last, t.id
  limit 1;

  if resolved_id is not null then
    new.template_id := resolved_id;
  elsif tg_op = 'UPDATE' and new.template_id is null then
    -- A rename, or an upsert that blanked the column, must never orphan a
    -- session that was already bound to a frame.
    new.template_id := old.template_id;
  end if;

  return new;
end;
$$;

drop trigger if exists gallery_sessions_resolve_template_id
  on public.gallery_sessions;

create trigger gallery_sessions_resolve_template_id
  before insert or update of template_name, template_id, organization_id
  on public.gallery_sessions
  for each row
  execute function public.resolve_gallery_session_template_id();

-- Backfill existing sessions whose name still matches exactly one template in
-- the same organization. Ambiguous names are left NULL so the reader can fall
-- back to the legacy name lookup.
update public.gallery_sessions as session
set template_id = matched.id
from (
  select
    s.id as session_id,
    min(t.id) as id,
    count(*) as match_count
  from public.gallery_sessions as s
  join public.templates as t
    on t.organization_id = s.organization_id
   and lower(btrim(t.name)) = lower(btrim(s.template_name))
  where s.template_id is null
    and btrim(coalesce(s.template_name, '')) <> ''
  group by s.id
) as matched
where session.id = matched.session_id
  and matched.match_count = 1
  and session.template_id is null;
