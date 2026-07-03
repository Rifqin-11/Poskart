create table if not exists public.payment_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  transaction_id text references public.transactions(id) on delete set null,
  provider text not null default 'duitku',
  payment_method text not null default 'QRIS',
  collection_mode text not null default 'platform',
  merchant_order_id text not null unique,
  duitku_reference text,
  status text not null default 'paid',
  settlement_status text,
  payout_invoice_id uuid references public.payout_invoices(id) on delete set null,
  gross_amount integer not null,
  gateway_fee_amount integer not null default 0,
  platform_fee_amount integer not null default 0,
  adjustment_amount integer not null default 0,
  net_amount integer not null,
  booth text,
  package_name text,
  paid_at timestamptz not null,
  verified_at timestamptz not null default now(),
  callback_payload jsonb not null default '{}'::jsonb,
  verified_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_ledger_entries_provider_check
    check (provider in ('duitku')),
  constraint payment_ledger_entries_method_check
    check (payment_method in ('QRIS')),
  constraint payment_ledger_entries_collection_mode_check
    check (collection_mode in ('platform', 'custom')),
  constraint payment_ledger_entries_status_check
    check (status in ('paid', 'refunded', 'voided')),
  constraint payment_ledger_entries_settlement_status_check
    check (
      settlement_status is null
      or settlement_status in ('requested', 'approved', 'paid')
    ),
  constraint payment_ledger_entries_amounts_check
    check (
      gross_amount >= 0
      and gateway_fee_amount >= 0
      and platform_fee_amount >= 0
      and net_amount >= 0
    )
);

create unique index if not exists payment_ledger_entries_duitku_reference_key
  on public.payment_ledger_entries (duitku_reference)
  where duitku_reference is not null;

create index if not exists payment_ledger_entries_payout_eligibility_idx
  on public.payment_ledger_entries (
    organization_id,
    status,
    provider,
    payment_method,
    collection_mode,
    settlement_status,
    paid_at,
    created_at
  );

create index if not exists payment_ledger_entries_invoice_idx
  on public.payment_ledger_entries (payout_invoice_id);

alter table public.payout_invoice_items
  add column if not exists ledger_entry_id uuid references public.payment_ledger_entries(id) on delete restrict,
  alter column transaction_id drop not null;

create unique index if not exists payout_invoice_items_ledger_entry_id_key
  on public.payout_invoice_items (ledger_entry_id)
  where ledger_entry_id is not null;

create or replace function public.prevent_payment_ledger_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'payment_ledger_entries are immutable and cannot be deleted';
end;
$$;

drop trigger if exists prevent_payment_ledger_delete
  on public.payment_ledger_entries;

create trigger prevent_payment_ledger_delete
before delete on public.payment_ledger_entries
for each row
execute function public.prevent_payment_ledger_delete();

create or replace function public.prevent_payment_ledger_core_update()
returns trigger
language plpgsql
as $$
begin
  if old.organization_id is distinct from new.organization_id
    or old.transaction_id is distinct from new.transaction_id
    or old.provider is distinct from new.provider
    or old.payment_method is distinct from new.payment_method
    or old.collection_mode is distinct from new.collection_mode
    or old.merchant_order_id is distinct from new.merchant_order_id
    or old.duitku_reference is distinct from new.duitku_reference
    or old.status is distinct from new.status
    or old.gross_amount is distinct from new.gross_amount
    or old.gateway_fee_amount is distinct from new.gateway_fee_amount
    or old.platform_fee_amount is distinct from new.platform_fee_amount
    or old.adjustment_amount is distinct from new.adjustment_amount
    or old.net_amount is distinct from new.net_amount
    or old.booth is distinct from new.booth
    or old.package_name is distinct from new.package_name
    or old.paid_at is distinct from new.paid_at
    or old.verified_at is distinct from new.verified_at
    or old.callback_payload is distinct from new.callback_payload
    or old.verified_response is distinct from new.verified_response
    or old.created_at is distinct from new.created_at
  then
    raise exception 'payment_ledger_entries core fields are immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prevent_payment_ledger_core_update
  on public.payment_ledger_entries;

create trigger prevent_payment_ledger_core_update
before update on public.payment_ledger_entries
for each row
execute function public.prevent_payment_ledger_core_update();

insert into public.payment_ledger_entries (
  organization_id,
  transaction_id,
  provider,
  payment_method,
  collection_mode,
  merchant_order_id,
  duitku_reference,
  status,
  settlement_status,
  payout_invoice_id,
  gross_amount,
  gateway_fee_amount,
  platform_fee_amount,
  adjustment_amount,
  net_amount,
  booth,
  package_name,
  paid_at,
  verified_at,
  callback_payload,
  verified_response,
  created_at,
  updated_at
)
select
  tx.organization_id,
  tx.id,
  'duitku',
  'QRIS',
  coalesce(tx.collection_mode, 'platform'),
  tx.merchant_order_id,
  tx.payment_reference,
  'paid',
  tx.payout_status,
  tx.payout_invoice_id,
  greatest(0, round(tx.amount)::integer),
  0,
  0,
  0,
  greatest(0, round(tx.amount)::integer),
  tx.booth,
  tx.package_name,
  coalesce(tx.paid_at, tx.created_at, now()),
  coalesce(tx.gateway_status_checked_at, tx.paid_at, tx.updated_at, now()),
  '{}'::jsonb,
  coalesce(tx.gateway_response, '{}'::jsonb),
  coalesce(tx.created_at, now()),
  now()
from public.transactions as tx
where tx.status = 'paid'
  and tx.provider = 'QRIS'
  and coalesce(tx.collection_mode, 'platform') = 'platform'
  and tx.payment_gateway = 'duitku'
  and tx.merchant_order_id is not null
on conflict (merchant_order_id) do nothing;

update public.payout_invoice_items as item
set ledger_entry_id = ledger.id
from public.payment_ledger_entries as ledger
where item.ledger_entry_id is null
  and item.transaction_id = ledger.transaction_id;

alter table public.payment_ledger_entries enable row level security;

drop policy if exists "Organization members can view payment ledger" on public.payment_ledger_entries;
drop policy if exists "Platform admins can manage payment ledger settlement" on public.payment_ledger_entries;

create policy "Organization members can view payment ledger"
  on public.payment_ledger_entries for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

create policy "Platform admins can manage payment ledger settlement"
  on public.payment_ledger_entries for update to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

revoke all on public.payment_ledger_entries from anon;
grant select on public.payment_ledger_entries to authenticated;

notify pgrst, 'reload schema';
