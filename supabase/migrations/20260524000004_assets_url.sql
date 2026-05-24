-- Migration: extend assets with storage URL & path so the admin Asset Library
-- can upload real files into the `builder-assets` bucket and render previews.

alter table public.assets
  add column if not exists url text,
  add column if not exists storage_path text;
