create extension if not exists pgcrypto;

create table if not exists public.gallery_sessions (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  device_id text references public.devices(id) on delete set null,
  template_name text not null default '',
  share_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.gallery_sessions(id) on delete cascade,
  organization_id text not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('raw', 'framed')),
  photo_index integer not null default 0,
  cloudinary_public_id text not null,
  secure_url text not null,
  width integer,
  height integer,
  bytes integer,
  format text,
  created_at timestamptz not null default now(),
  unique (session_id, kind, photo_index)
);

create index if not exists gallery_sessions_organization_created_at_idx
  on public.gallery_sessions (organization_id, created_at desc);

create index if not exists gallery_photos_session_idx
  on public.gallery_photos (session_id, kind, photo_index);

alter table public.gallery_sessions enable row level security;
alter table public.gallery_photos enable row level security;

drop policy if exists "Organization members can view gallery sessions"
  on public.gallery_sessions;
create policy "Organization members can view gallery sessions"
  on public.gallery_sessions for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

drop policy if exists "Organization members can manage gallery sessions"
  on public.gallery_sessions;
create policy "Organization members can manage gallery sessions"
  on public.gallery_sessions for all to authenticated
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

drop policy if exists "Organization members can view gallery photos"
  on public.gallery_photos;
create policy "Organization members can view gallery photos"
  on public.gallery_photos for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

drop policy if exists "Organization members can manage gallery photos"
  on public.gallery_photos;
create policy "Organization members can manage gallery photos"
  on public.gallery_photos for all to authenticated
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

grant select, insert, update, delete on public.gallery_sessions to authenticated;
grant select, insert, update, delete on public.gallery_photos to authenticated;
