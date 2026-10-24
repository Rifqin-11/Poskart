alter table public.gallery_photos
  add column if not exists thumbnail_public_id text,
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_width integer,
  add column if not exists thumbnail_height integer,
  add column if not exists thumbnail_bytes integer,
  add column if not exists thumbnail_format text;
