alter table public.gallery_sessions
  add column if not exists theme_name text
    not null default '';

create index if not exists gallery_sessions_organization_theme_name_idx
  on public.gallery_sessions (organization_id, lower(trim(theme_name)));
