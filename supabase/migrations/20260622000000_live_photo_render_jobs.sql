create table if not exists public.live_photo_render_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.gallery_sessions(id) on delete cascade,
  organization_id text not null references public.organizations(id) on delete cascade,
  device_id text references public.devices(id) on delete set null,
  template_name text not null default '',
  theme_name text not null default '',
  social_media_consent boolean not null default false,
  template jsonb not null default '{}'::jsonb,
  source_assets jsonb not null default '[]'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed')),
  attempts integer not null default 0,
  output_public_id text,
  output_secure_url text,
  output_width integer,
  output_height integer,
  output_bytes integer,
  output_format text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (session_id)
);

create index if not exists live_photo_render_jobs_status_created_at_idx
  on public.live_photo_render_jobs (status, created_at);

create index if not exists live_photo_render_jobs_organization_created_at_idx
  on public.live_photo_render_jobs (organization_id, created_at desc);

alter table public.live_photo_render_jobs enable row level security;

drop policy if exists "Organization members can view live photo jobs"
  on public.live_photo_render_jobs;
create policy "Organization members can view live photo jobs"
  on public.live_photo_render_jobs for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

drop policy if exists "Organization members can manage live photo jobs"
  on public.live_photo_render_jobs;
create policy "Organization members can manage live photo jobs"
  on public.live_photo_render_jobs for all to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  )
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.live_photo_render_jobs to authenticated;
