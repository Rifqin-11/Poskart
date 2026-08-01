-- A retake can enqueue a newer Live Photo while a worker is still rendering
-- the prior one. Keep a monotonically increasing generation per session so an
-- older worker can never overwrite the newest gallery output.
alter table public.live_photo_render_jobs
  add column if not exists render_generation bigint not null default 0,
  add column if not exists source_generation bigint not null default 0;

alter table public.gallery_sessions
  add column if not exists media_generation bigint not null default 0;

create or replace function public.complete_gallery_upload_generation(
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
      format
    )
    values (
      p_session_id,
      p_organization_id,
      asset->>'kind',
      greatest(0, coalesce((asset->>'photoIndex')::integer, 0)),
      coalesce(nullif(asset->>'storageProvider', ''), 'cloudinary'),
      asset->>'publicId',
      asset->>'publicId',
      asset->>'secureUrl',
      coalesce(nullif(asset->>'resourceType', ''), 'image'),
      nullif(asset->>'width', '')::integer,
      nullif(asset->>'height', '')::integer,
      nullif(asset->>'bytes', '')::integer,
      nullif(asset->>'format', '')
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
      format = excluded.format;
  end loop;

  return jsonb_build_object(
    'applied', true,
    'replacedGeneration', replaced_generation
  );
end;
$$;

create or replace function public.enqueue_live_photo_render_job(
  p_session_id text,
  p_organization_id text,
  p_device_id text,
  p_template_name text,
  p_theme_name text,
  p_social_media_consent boolean,
  p_test_mode boolean,
  p_share_url text,
  p_source_generation bigint,
  p_template jsonb,
  p_source_assets jsonb
)
returns public.live_photo_render_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.live_photo_render_jobs;
  session_generation bigint;
  session_organization_id text;
begin
  select organization_id, media_generation
  into session_organization_id, session_generation
  from public.gallery_sessions
  where id = p_session_id
  for update;

  if found then
    if session_organization_id <> p_organization_id then
      raise exception 'Gallery session does not belong to this organization';
    end if;
    if session_generation > p_source_generation then
      return null;
    end if;

    update public.gallery_sessions
    set
      device_id = p_device_id,
      template_name = p_template_name,
      theme_name = p_theme_name,
      social_media_consent = p_social_media_consent,
      test_mode = p_test_mode,
      share_url = p_share_url,
      media_generation = greatest(media_generation, p_source_generation),
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
      p_source_generation,
      now()
    );
  end if;

  select *
  into job
  from public.live_photo_render_jobs
  where session_id = p_session_id
  for update;

  if found then
    if job.source_generation > p_source_generation then
      return job;
    end if;
    if job.source_generation = p_source_generation
       and job.status <> 'failed' then
      return job;
    end if;

    update public.live_photo_render_jobs
    set
      organization_id = p_organization_id,
      device_id = p_device_id,
      template_name = p_template_name,
      theme_name = p_theme_name,
      social_media_consent = p_social_media_consent,
      template = coalesce(p_template, '{}'::jsonb),
      source_assets = coalesce(p_source_assets, '[]'::jsonb),
      status = 'queued',
      attempts = 0,
      source_generation = p_source_generation,
      render_generation = job.render_generation + 1,
      output_public_id = null,
      output_secure_url = null,
      output_width = null,
      output_height = null,
      output_bytes = null,
      output_format = null,
      error_message = null,
      worker_id = null,
      started_at = null,
      completed_at = null,
      updated_at = now()
    where id = job.id
    returning * into job;

    return job;
  end if;

  insert into public.live_photo_render_jobs (
    session_id,
    organization_id,
    device_id,
    template_name,
    theme_name,
    social_media_consent,
    template,
    source_assets,
    status,
    attempts,
    render_generation,
    source_generation,
    output_public_id,
    output_secure_url,
    output_width,
    output_height,
    output_bytes,
    output_format,
    error_message,
    started_at,
    completed_at,
    updated_at
  )
  values (
    p_session_id,
    p_organization_id,
    p_device_id,
    p_template_name,
    p_theme_name,
    p_social_media_consent,
    coalesce(p_template, '{}'::jsonb),
    coalesce(p_source_assets, '[]'::jsonb),
    'queued',
    0,
    1,
    p_source_generation,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    now()
  )
  returning * into job;

  return job;
end;
$$;

create or replace function public.complete_live_photo_render_job(
  p_job_id uuid,
  p_render_generation bigint,
  p_worker_id text,
  p_storage_provider text,
  p_public_id text,
  p_secure_url text,
  p_resource_type text,
  p_width integer,
  p_height integer,
  p_bytes integer,
  p_format text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.live_photo_render_jobs;
begin
  select *
  into job
  from public.live_photo_render_jobs
  where id = p_job_id
    and render_generation = p_render_generation
    and status = 'processing'
    and worker_id = p_worker_id
  for update;

  if not found then
    return false;
  end if;

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
    format
  )
  values (
    job.session_id,
    job.organization_id,
    'framed',
    1,
    p_storage_provider,
    p_public_id,
    p_public_id,
    p_secure_url,
    p_resource_type,
    p_width,
    p_height,
    p_bytes,
    p_format
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
    format = excluded.format;

  update public.live_photo_render_jobs
  set
    status = 'succeeded',
    output_public_id = p_public_id,
    output_secure_url = p_secure_url,
    output_width = p_width,
    output_height = p_height,
    output_bytes = p_bytes,
    output_format = p_format,
    error_message = null,
    completed_at = now(),
    updated_at = now()
  where id = job.id
    and render_generation = job.render_generation;

  return true;
end;
$$;

revoke execute on function public.enqueue_live_photo_render_job(text, text, text, text, text, boolean, boolean, text, bigint, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.enqueue_live_photo_render_job(text, text, text, text, text, boolean, boolean, text, bigint, jsonb, jsonb)
  to service_role;

revoke execute on function public.complete_live_photo_render_job(uuid, bigint, text, text, text, text, text, integer, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.complete_live_photo_render_job(uuid, bigint, text, text, text, text, text, integer, integer, integer, text)
  to service_role;

revoke execute on function public.complete_gallery_upload_generation(text, text, text, text, text, boolean, boolean, bigint, boolean, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.complete_gallery_upload_generation(text, text, text, text, text, boolean, boolean, bigint, boolean, jsonb, text)
  to service_role;
