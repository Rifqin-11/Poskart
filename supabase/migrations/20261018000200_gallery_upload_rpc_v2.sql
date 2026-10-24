create or replace function public.complete_gallery_upload_generation_v2(
  p_session_id text,
  p_organization_id text,
  p_device_id text,
  p_template_name text,
  p_theme_name text,
  p_social_media_consent boolean,
  p_test_mode boolean,
  p_media_generation bigint,
  p_replace_generation boolean,
  p_assets jsonb,
  p_share_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_generation bigint;
  current_organization_id text;
  replaced_generation boolean := false;
  asset jsonb;
begin
  select organization_id, media_generation
  into current_organization_id, current_generation
  from public.gallery_sessions
  where id = p_session_id
  for update;

  if found then
    if current_organization_id <> p_organization_id then
      raise exception 'Gallery session does not belong to this organization';
    end if;

    if current_generation > p_media_generation then
      return jsonb_build_object('applied', false, 'replacedGeneration', false);
    end if;
  end if;

  if found then
    if p_replace_generation and current_generation < p_media_generation then
      replaced_generation := true;
      delete from public.gallery_photos
      where session_id = p_session_id
        and (
          (kind = 'raw' and photo_index = 98)
          or (kind = 'framed' and photo_index = 1)
        );
    end if;

    update public.gallery_sessions
    set
      organization_id = p_organization_id,
      device_id = p_device_id,
      template_name = p_template_name,
      theme_name = p_theme_name,
      social_media_consent = p_social_media_consent,
      test_mode = p_test_mode,
      share_url = p_share_url,
      media_generation = greatest(media_generation, p_media_generation),
      updated_at = now()
    where id = p_session_id;
  else
    insert into public.gallery_sessions (
      id,
      organization_id,
      device_id,
      template_name,
      theme_name,
      social_media_consent,
      test_mode,
      share_url,
      media_generation,
      updated_at
    )
    values (
      p_session_id,
      p_organization_id,
      p_device_id,
      p_template_name,
      p_theme_name,
      p_social_media_consent,
      p_test_mode,
      p_share_url,
      p_media_generation,
      now()
    );
  end if;

  for asset in
    select value from jsonb_array_elements(coalesce(p_assets, '[]'::jsonb))
  loop
    insert into public.gallery_photos (
      session_id,
      organization_id,
      kind,
      photo_index,
      storage_provider,
      cloudinary_public_id,
      provider_public_id,
      secure_url,
      resource_type,
      width,
      height,
      bytes,
      format,
      thumbnail_public_id,
      thumbnail_url,
      thumbnail_width,
      thumbnail_height,
      thumbnail_bytes,
      thumbnail_format
    )
    values (
      p_session_id,
      p_organization_id,
      asset->>'kind',
      greatest(0, coalesce((asset->>'photoIndex')::integer, 0)),
      coalesce(nullif(asset->>'storageProvider', ''), 'cloudinary'),
      asset->'original'->>'publicId',
      asset->'original'->>'publicId',
      asset->'original'->>'secureUrl',
      coalesce(nullif(asset->>'resourceType', ''), 'image'),
      nullif(asset->'original'->>'width', '')::integer,
      nullif(asset->'original'->>'height', '')::integer,
      nullif(asset->'original'->>'bytes', '')::integer,
      nullif(asset->'original'->>'format', ''),
      asset->'thumbnail'->>'publicId',
      asset->'thumbnail'->>'secureUrl',
      nullif(asset->'thumbnail'->>'width', '')::integer,
      nullif(asset->'thumbnail'->>'height', '')::integer,
      nullif(asset->'thumbnail'->>'bytes', '')::integer,
      nullif(asset->'thumbnail'->>'format', '')
    )
    on conflict (session_id, kind, photo_index) do update
    set
      organization_id = excluded.organization_id,
      storage_provider = excluded.storage_provider,
      cloudinary_public_id = excluded.cloudinary_public_id,
      provider_public_id = excluded.provider_public_id,
      secure_url = excluded.secure_url,
      resource_type = excluded.resource_type,
      width = excluded.width,
      height = excluded.height,
      bytes = excluded.bytes,
      format = excluded.format,
      thumbnail_public_id = coalesce(excluded.thumbnail_public_id, gallery_photos.thumbnail_public_id),
      thumbnail_url = coalesce(excluded.thumbnail_url, gallery_photos.thumbnail_url),
      thumbnail_width = coalesce(excluded.thumbnail_width, gallery_photos.thumbnail_width),
      thumbnail_height = coalesce(excluded.thumbnail_height, gallery_photos.thumbnail_height),
      thumbnail_bytes = coalesce(excluded.thumbnail_bytes, gallery_photos.thumbnail_bytes),
      thumbnail_format = coalesce(excluded.thumbnail_format, gallery_photos.thumbnail_format);
  end loop;

  return jsonb_build_object(
    'applied', true,
    'replacedGeneration', replaced_generation
  );
end;
$$;

revoke execute on function public.complete_gallery_upload_generation_v2(
  text, text, text, text, text, boolean, boolean, bigint, boolean, jsonb, text
) from public, anon, authenticated;

grant execute on function public.complete_gallery_upload_generation_v2(
  text, text, text, text, text, boolean, boolean, bigint, boolean, jsonb, text
) to service_role;
