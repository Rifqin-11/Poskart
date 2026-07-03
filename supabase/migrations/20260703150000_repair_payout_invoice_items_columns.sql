alter table public.payout_invoice_items
  add column if not exists payment_gateway text,
  add column if not exists booth text,
  add column if not exists package_name text,
  add column if not exists transaction_paid_at timestamptz,
  add column if not exists gateway_fee_amount integer not null default 0,
  add column if not exists platform_fee_amount integer not null default 0,
  add column if not exists ledger_entry_id uuid references public.payment_ledger_entries(id) on delete restrict;

alter table public.payout_invoice_items
  alter column transaction_id drop not null;

create unique index if not exists payout_invoice_items_ledger_entry_id_key
  on public.payout_invoice_items (ledger_entry_id)
  where ledger_entry_id is not null;

update public.payout_invoice_items as item
set
  ledger_entry_id = ledger.id,
  payment_gateway = coalesce(item.payment_gateway, ledger.provider),
  booth = coalesce(item.booth, ledger.booth),
  package_name = coalesce(item.package_name, ledger.package_name),
  transaction_paid_at = coalesce(item.transaction_paid_at, ledger.paid_at),
  gateway_fee_amount = coalesce(item.gateway_fee_amount, ledger.gateway_fee_amount),
  platform_fee_amount = coalesce(item.platform_fee_amount, ledger.platform_fee_amount)
from public.payment_ledger_entries as ledger
where item.ledger_entry_id is null
  and item.transaction_id = ledger.transaction_id;

notify pgrst, 'reload schema';
