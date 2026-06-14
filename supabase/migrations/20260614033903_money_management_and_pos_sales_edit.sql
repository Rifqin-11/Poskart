drop policy if exists "Organization members can update POS sales"
  on public.pos_sales;
create policy "Organization members can update POS sales"
  on public.pos_sales
  for update
  to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  )
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

grant update on public.pos_sales to authenticated;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.pos_sales'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%print_count%'
  loop
    execute format(
      'alter table public.pos_sales drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.pos_sales
  add constraint pos_sales_print_count_check
  check (print_count between 1 and 100);

create table if not exists public.money_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  entry_type text not null check (entry_type in ('income', 'expense')),
  category text not null check (
    category in (
      'opening_balance',
      'sales_income',
      'other_income',
      'operational_expense',
      'purchase',
      'withdrawal',
      'correction',
      'other_expense'
    )
  ),
  amount bigint not null check (amount > 0),
  title text not null check (char_length(trim(title)) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 500),
  occurred_at timestamptz not null default now(),
  created_by uuid not null default auth.uid()
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists money_entries_organization_occurred_at_idx
  on public.money_entries (organization_id, occurred_at desc);

alter table public.money_entries enable row level security;

drop policy if exists "Organization members can view money entries"
  on public.money_entries;
create policy "Organization members can view money entries"
  on public.money_entries for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

drop policy if exists "Organization members can create money entries"
  on public.money_entries;
create policy "Organization members can create money entries"
  on public.money_entries for insert to authenticated
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

drop policy if exists "Organization members can update money entries"
  on public.money_entries;
create policy "Organization members can update money entries"
  on public.money_entries for update to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  )
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

drop policy if exists "Organization members can delete money entries"
  on public.money_entries;
create policy "Organization members can delete money entries"
  on public.money_entries for delete to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.money_entries to authenticated;

notify pgrst, 'reload schema';
