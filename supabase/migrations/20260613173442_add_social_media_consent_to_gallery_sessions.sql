alter table public.gallery_sessions
  add column if not exists social_media_consent boolean
    not null default false;
