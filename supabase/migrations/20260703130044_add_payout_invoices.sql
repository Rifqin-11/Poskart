alter table public.app_configs
  add column if not exists gateway_fee_percentage numeric(5, 2) not null default 0,
  add column if not exists platform_fee_percentage numeric(5, 2) not null default 0,
  add column if not exists minimum_payout_amount integer not null default 0;

alter table public.app_configs
  drop constraint if exists app_configs_payout_fee_percentage_check,
  drop constraint if exists app_configs_minimum_payout_amount_check;

alter table public.app_configs
  add constraint app_configs_payout_fee_percentage_check
  check (
    gateway_fee_percentage between 0 and 100
    and platform_fee_percentage between 0 and 100
  ),
  add constraint app_configs_minimum_payout_amount_check
  check (minimum_payout_amount >= 0);

alter table public.organizations
  add column if not exists payment_collection_mode text not null default 'platform';

alter table public.organizations
  drop constraint if exists organizations_payment_collection_mode_check;

alter table public.organizations
  add constraint organizations_payment_collection_mode_check
  check (payment_collection_mode in ('platform', 'custom'));

create table if not exists public.organization_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_holder_name text not null,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  organization_id text not null references public.organizations(id) on delete cascade,
  payout_account_id uuid references public.organization_payout_accounts(id) on delete set null,
  status text not null default 'requested',
  gross_amount integer not null default 0,
  gateway_fee_amount integer not null default 0,
  platform_fee_amount integer not null default 0,
  adjustment_amount integer not null default 0,
  net_amount integer not null default 0,
  requested_amount integer not null default 0,
  requested_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  paid_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  notes text,
  review_notes text,
  rejection_reason text,
  account_snapshot jsonb not null default '{}'::jsonb,
  fee_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_invoices_status_check
    check (status in ('requested', 'approved', 'paid', 'rejected', 'canceled')),
  constraint payout_invoices_amounts_check
    check (
      gross_amount >= 0
      and gateway_fee_amount >= 0
      and platform_fee_amount >= 0
      and requested_amount >= 0
      and net_amount >= 0
    )
);

alter table public.transactions
  add column if not exists collection_mode text not null default 'platform',
  add column if not exists payout_status text,
  add column if not exists payout_invoice_id uuid references public.payout_invoices(id) on delete set null;

alter table public.transactions
  drop constraint if exists transactions_collection_mode_check,
  drop constraint if exists transactions_payout_status_check;

alter table public.transactions
  add constraint transactions_collection_mode_check
  check (collection_mode in ('platform', 'custom')),
  add constraint transactions_payout_status_check
  check (payout_status is null or payout_status in ('requested', 'approved', 'paid'));

create table if not exists public.payout_invoice_items (
  id uuid primary key default gen_random_uuid(),
  payout_invoice_id uuid not null references public.payout_invoices(id) on delete cascade,
  organization_id text not null references public.organizations(id) on delete cascade,
  transaction_id text not null references public.transactions(id) on delete restrict,
  payment_gateway text,
  booth text,
  package_name text,
  transaction_paid_at timestamptz,
  gross_amount integer not null,
  gateway_fee_amount integer not null default 0,
  platform_fee_amount integer not null default 0,
  net_amount integer not null,
  created_at timestamptz not null default now(),
  unique (transaction_id),
  constraint payout_invoice_items_amounts_check
    check (
      gross_amount >= 0
      and gateway_fee_amount >= 0
      and platform_fee_amount >= 0
      and net_amount >= 0
    )
);

create index if not exists organization_payout_accounts_org_idx
  on public.organization_payout_accounts (organization_id, is_default);

create index if not exists payout_invoices_org_status_idx
  on public.payout_invoices (organization_id, status, requested_at desc);

create index if not exists payout_invoice_items_invoice_idx
  on public.payout_invoice_items (payout_invoice_id);

create index if not exists transactions_payout_eligibility_idx
  on public.transactions (
    organization_id,
    status,
    provider,
    collection_mode,
    payout_status,
    payment_gateway,
    paid_at,
    created_at
  );

alter table public.organization_payout_accounts enable row level security;
alter table public.payout_invoices enable row level security;
alter table public.payout_invoice_items enable row level security;

drop policy if exists "Organization members can view payout accounts" on public.organization_payout_accounts;
drop policy if exists "Organization managers can manage payout accounts" on public.organization_payout_accounts;

create policy "Organization members can view payout accounts"
  on public.organization_payout_accounts for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

create policy "Organization managers can manage payout accounts"
  on public.organization_payout_accounts for all to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  )
  with check (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

drop policy if exists "Organization members can view payout invoices" on public.payout_invoices;
drop policy if exists "Organization managers can request payout invoices" on public.payout_invoices;

create policy "Organization members can view payout invoices"
  on public.payout_invoices for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

create policy "Organization managers can request payout invoices"
  on public.payout_invoices for insert to authenticated
  with check (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

create policy "Platform admins can manage payout invoices"
  on public.payout_invoices for update to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

drop policy if exists "Organization members can view payout invoice items" on public.payout_invoice_items;
drop policy if exists "Organization managers can create payout invoice items" on public.payout_invoice_items;

create policy "Organization members can view payout invoice items"
  on public.payout_invoice_items for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

create policy "Organization managers can create payout invoice items"
  on public.payout_invoice_items for insert to authenticated
  with check (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

create policy "Platform admins can manage payout invoice items"
  on public.payout_invoice_items for update to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

revoke all on public.organization_payout_accounts from anon;
revoke all on public.payout_invoices from anon;
revoke all on public.payout_invoice_items from anon;

grant select, insert, update, delete on public.organization_payout_accounts to authenticated;
grant select, insert, update on public.payout_invoices to authenticated;
grant select, insert, update on public.payout_invoice_items to authenticated;

notify pgrst, 'reload schema';
