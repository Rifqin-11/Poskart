alter table public.app_configs
  add column if not exists gallery_storage_provider text not null default 'cloudinary',
  add column if not exists gallery_imagekit_public_key text,
  add column if not exists gallery_imagekit_private_key_ciphertext text,
  add column if not exists gallery_imagekit_private_key_iv text,
  add column if not exists gallery_imagekit_private_key_tag text,
  add column if not exists gallery_imagekit_private_key_last4 text,
  add column if not exists gallery_imagekit_url_endpoint text,
  add column if not exists gallery_cloudinary_cloud_name text,
  add column if not exists gallery_cloudinary_api_key text,
  add column if not exists gallery_cloudinary_api_secret_ciphertext text,
  add column if not exists gallery_cloudinary_api_secret_iv text,
  add column if not exists gallery_cloudinary_api_secret_tag text,
  add column if not exists gallery_cloudinary_api_secret_last4 text;

alter table public.gallery_photos
  add column if not exists storage_provider text not null default 'cloudinary',
  add column if not exists provider_public_id text,
  add column if not exists resource_type text not null default 'image';

update public.gallery_photos
set
  storage_provider = coalesce(nullif(storage_provider, ''), 'cloudinary'),
  provider_public_id = coalesce(provider_public_id, cloudinary_public_id),
  resource_type = case
    when lower(coalesce(format, '')) in ('mp4', 'mov', 'webm') then 'video'
    else coalesce(nullif(resource_type, ''), 'image')
  end
where provider_public_id is null
   or storage_provider is null
   or storage_provider = ''
   or resource_type is null
   or resource_type = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_configs_gallery_storage_provider_check'
  ) then
    alter table public.app_configs
      add constraint app_configs_gallery_storage_provider_check
      check (gallery_storage_provider in ('cloudinary', 'imagekit'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gallery_photos_storage_provider_check'
  ) then
    alter table public.gallery_photos
      add constraint gallery_photos_storage_provider_check
      check (storage_provider in ('cloudinary', 'imagekit'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gallery_photos_resource_type_check'
  ) then
    alter table public.gallery_photos
      add constraint gallery_photos_resource_type_check
      check (resource_type in ('image', 'video'));
  end if;
end $$;

create index if not exists gallery_photos_storage_provider_idx
  on public.gallery_photos (storage_provider, provider_public_id);
