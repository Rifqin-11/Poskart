create table if not exists public.money_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 40),
  created_by uuid not null default auth.uid()
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists money_tags_org_name_unique_idx
  on public.money_tags (organization_id, lower(trim(name)));

create table if not exists public.money_entry_tags (
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  money_entry_id uuid not null
    references public.money_entries(id) on delete cascade,
  money_tag_id uuid not null
    references public.money_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (money_entry_id, money_tag_id)
);

create index if not exists money_entry_tags_org_tag_idx
  on public.money_entry_tags (organization_id, money_tag_id);

alter table public.money_tags enable row level security;
alter table public.money_entry_tags enable row level security;

create policy "Organization members can view money tags"
  on public.money_tags for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

create policy "Organization members can create money tags"
  on public.money_tags for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.is_auth_admin()
      or organization_id in (
        select organization_id
        from public.organization_members
        where profile_id = (select auth.uid())
      )
    )
  );

create policy "Organization members can delete money tags"
  on public.money_tags for delete to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

create policy "Organization members can view money entry tags"
  on public.money_entry_tags for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

create policy "Organization members can create money entry tags"
  on public.money_entry_tags for insert to authenticated
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

create policy "Organization members can delete money entry tags"
  on public.money_entry_tags for delete to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.money_tags to authenticated;
grant select, insert, delete on public.money_entry_tags to authenticated;

notify pgrst, 'reload schema';
