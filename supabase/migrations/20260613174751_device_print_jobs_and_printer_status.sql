alter table public.devices
  add column if not exists printer_status text
    not null default 'unknown'
    check (
      printer_status in (
        'ready',
        'disconnected',
        'permission_required',
        'paper_out',
        'error',
        'unknown'
      )
    ),
  add column if not exists printer_name text,
  add column if not exists printer_last_error text,
  add column if not exists printer_status_updated_at timestamptz,
  add column if not exists printer_bidirectional boolean not null default false;

create table if not exists public.device_print_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references public.organizations(id) on delete cascade,
  device_id text not null
    references public.devices(id) on delete cascade,
  gallery_session_id text
    references public.gallery_sessions(id) on delete set null,
  source_url text not null,
  copies integer not null default 1 check (copies between 1 and 20),
  status text not null default 'queued'
    check (
      status in ('queued', 'processing', 'printed', 'failed', 'cancelled')
    ),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists device_print_jobs_device_queue_idx
  on public.device_print_jobs (device_id, status, requested_at);

create index if not exists device_print_jobs_organization_requested_idx
  on public.device_print_jobs (organization_id, requested_at desc);

alter table public.device_print_jobs enable row level security;

drop policy if exists "Organization members can view device print jobs"
  on public.device_print_jobs;
create policy "Organization members can view device print jobs"
  on public.device_print_jobs for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

drop policy if exists "Organization members can create device print jobs"
  on public.device_print_jobs;
create policy "Organization members can create device print jobs"
  on public.device_print_jobs for insert to authenticated
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

drop policy if exists "Organization members can update device print jobs"
  on public.device_print_jobs;
create policy "Organization members can update device print jobs"
  on public.device_print_jobs for update to authenticated
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

grant select, insert, update on public.device_print_jobs to authenticated;
