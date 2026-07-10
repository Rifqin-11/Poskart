alter table public.gallery_sessions
  add column if not exists test_mode boolean not null default false;

create index if not exists gallery_sessions_organization_test_mode_idx
  on public.gallery_sessions (organization_id, test_mode, created_at desc)
  where test_mode = true;
