create table if not exists public.shared_galleries (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  name text not null check (
    char_length(btrim(name)) between 1 and 100
  ),
  public_token text not null unique
    default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_gallery_sessions (
  shared_gallery_id uuid not null
    references public.shared_galleries(id) on delete cascade,
  gallery_session_id text not null
    references public.gallery_sessions(id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (shared_gallery_id, gallery_session_id),
  unique (shared_gallery_id, position)
);

create index if not exists shared_galleries_organization_created_at_idx
  on public.shared_galleries (organization_id, created_at desc);

create index if not exists shared_gallery_sessions_session_idx
  on public.shared_gallery_sessions (gallery_session_id);

alter table public.shared_galleries enable row level security;
alter table public.shared_gallery_sessions enable row level security;

drop policy if exists "Organization members can manage shared galleries"
  on public.shared_galleries;
create policy "Organization members can manage shared galleries"
  on public.shared_galleries for all to authenticated
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

drop policy if exists "Organization members can manage shared gallery sessions"
  on public.shared_gallery_sessions;
create policy "Organization members can manage shared gallery sessions"
  on public.shared_gallery_sessions for all to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.shared_galleries shared_gallery
      join public.organization_members member
        on member.organization_id = shared_gallery.organization_id
      where shared_gallery.id = shared_gallery_sessions.shared_gallery_id
        and member.profile_id = auth.uid()
    )
  )
  with check (
    public.is_auth_admin()
    or exists (
      select 1
      from public.shared_galleries shared_gallery
      join public.gallery_sessions gallery_session
        on gallery_session.id = shared_gallery_sessions.gallery_session_id
       and gallery_session.organization_id = shared_gallery.organization_id
      join public.organization_members member
        on member.organization_id = shared_gallery.organization_id
      where shared_gallery.id = shared_gallery_sessions.shared_gallery_id
        and member.profile_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.shared_galleries to authenticated;
grant select, insert, update, delete on public.shared_gallery_sessions to authenticated;

revoke all on public.shared_galleries from anon;
revoke all on public.shared_gallery_sessions from anon;
