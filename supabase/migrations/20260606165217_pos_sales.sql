create table if not exists public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 100),
  package_code text not null check (package_code in ('print_1', 'print_2', 'print_3')),
  package_name text not null,
  print_count integer not null check (print_count between 1 and 3),
  amount integer not null check (amount >= 0),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'QRIS')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists pos_sales_organization_created_at_idx
  on public.pos_sales (organization_id, created_at desc);

alter table public.pos_sales enable row level security;

create policy "Organization members can view POS sales"
  on public.pos_sales
  for select
  to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

create policy "Organization members can create POS sales"
  on public.pos_sales
  for insert
  to authenticated
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

grant select, insert on public.pos_sales to authenticated;
