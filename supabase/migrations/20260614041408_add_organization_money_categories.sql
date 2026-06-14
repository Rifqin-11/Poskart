alter table public.money_entries
  drop constraint if exists money_entries_category_check;

create table if not exists public.money_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  entry_type text not null check (entry_type in ('income', 'expense')),
  name text not null check (char_length(trim(name)) between 2 and 60),
  created_by uuid not null default auth.uid()
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists money_categories_org_type_name_unique_idx
  on public.money_categories (
    organization_id,
    entry_type,
    lower(trim(name))
  );

create index if not exists money_categories_organization_idx
  on public.money_categories (organization_id, entry_type, name);

alter table public.money_categories enable row level security;

create policy "Organization members can view money categories"
  on public.money_categories for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

create policy "Organization members can create money categories"
  on public.money_categories for insert to authenticated
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

create policy "Organization members can delete money categories"
  on public.money_categories for delete to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.money_categories to authenticated;

notify pgrst, 'reload schema';
