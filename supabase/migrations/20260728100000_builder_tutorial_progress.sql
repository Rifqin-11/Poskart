alter table public.profile_tutorial_progress
  add column if not exists builder_completed_at timestamptz;

-- The builder tour is introduced after existing workspaces have already been
-- configured, so only accounts created after this migration see it automatically.
update public.profile_tutorial_progress
set builder_completed_at = coalesce(builder_completed_at, now());
