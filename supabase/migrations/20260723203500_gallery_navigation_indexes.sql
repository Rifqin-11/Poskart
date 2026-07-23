-- Matches the initial gallery query and its related lookups. These indexes
-- keep the first 50-card page bounded as each organization accumulates data.
create index if not exists gallery_sessions_organization_created_id_idx
  on public.gallery_sessions (organization_id, created_at desc, id desc);

create index if not exists shared_gallery_sessions_shared_gallery_idx
  on public.shared_gallery_sessions (shared_gallery_id);

create index if not exists live_photo_render_jobs_organization_session_idx
  on public.live_photo_render_jobs (organization_id, session_id);
