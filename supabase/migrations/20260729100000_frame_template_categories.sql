-- Group frame templates into optional, organization-scoped collections.
-- Templates without a category remain available and do not cause tabs to show
-- on the kiosk frame picker.

create table if not exists public.frame_categories (
  id text primary key,
  organization_id text not null default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 64),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists frame_categories_organization_name_key
  on public.frame_categories (organization_id, lower(name));

create index if not exists frame_categories_organization_display_order_idx
  on public.frame_categories (organization_id, display_order, created_at);

alter table public.templates
  add column if not exists frame_category_id text
    references public.frame_categories(id) on delete set null;

create index if not exists templates_organization_frame_category_idx
  on public.templates (organization_id, frame_category_id);

alter table public.frame_categories enable row level security;

drop policy if exists "Manage frame categories" on public.frame_categories;
create policy "Manage frame categories" on public.frame_categories
  for all to authenticated
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

grant select, insert, update, delete on public.frame_categories to authenticated;
