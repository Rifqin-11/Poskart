alter table public.money_entries
  drop constraint if exists money_entries_wallet_type_check;

alter table public.money_entries
  add constraint money_entries_wallet_type_check
  check (
    char_length(trim(wallet_type)) between 2 and 80
    and wallet_type = lower(wallet_type)
  );

create table if not exists public.money_wallets (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  code text not null check (
    code ~ '^wallet_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  name text not null check (char_length(trim(name)) between 2 and 40),
  created_by uuid not null default auth.uid()
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists money_wallets_org_code_unique_idx
  on public.money_wallets (organization_id, code);

create unique index if not exists money_wallets_org_name_unique_idx
  on public.money_wallets (organization_id, lower(trim(name)));

create index if not exists money_wallets_organization_idx
  on public.money_wallets (organization_id, name);

alter table public.money_wallets enable row level security;

create policy "Organization members can view money wallets"
  on public.money_wallets for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

create policy "Organization members can create money wallets"
  on public.money_wallets for insert to authenticated
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

create policy "Organization members can delete money wallets"
  on public.money_wallets for delete to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.money_wallets to authenticated;

notify pgrst, 'reload schema';
