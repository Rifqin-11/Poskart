alter table public.payment_ledger_entries
  add column if not exists gateway_settlement_status text,
  add column if not exists gateway_settlement_date date,
  add column if not exists gateway_balance_available_at timestamptz;

-- Historical ledger entries were already withdrawable before settlement
-- tracking existed. Keep them available so deployment does not lock balances
-- that organizations could previously withdraw.
update public.payment_ledger_entries
set
  gateway_settlement_status = 'settled',
  gateway_settlement_date = coalesce(
    gateway_settlement_date,
    (paid_at at time zone 'Asia/Jakarta')::date
  ),
  gateway_balance_available_at = coalesce(
    gateway_balance_available_at,
    verified_at,
    paid_at,
    created_at
  )
where gateway_settlement_status is null;

alter table public.payment_ledger_entries
  alter column gateway_settlement_status set default 'pending',
  alter column gateway_settlement_status set not null,
  drop constraint if exists payment_ledger_entries_gateway_settlement_status_check;

alter table public.payment_ledger_entries
  add constraint payment_ledger_entries_gateway_settlement_status_check
  check (gateway_settlement_status in ('pending', 'settled'));

alter table public.payment_ledger_entries
  drop constraint if exists payment_ledger_entries_gateway_settlement_availability_check;

alter table public.payment_ledger_entries
  add constraint payment_ledger_entries_gateway_settlement_availability_check
  check (
    (gateway_settlement_status = 'pending' and gateway_balance_available_at is null)
    or
    (gateway_settlement_status = 'settled' and gateway_balance_available_at is not null)
  );

comment on column public.payment_ledger_entries.gateway_settlement_status is
  'Payout availability based on Duitku settlementDate. Settled is estimated because Duitku does not expose settlement confirmation via API.';

create index if not exists payment_ledger_entries_gateway_settlement_due_idx
  on public.payment_ledger_entries (
    gateway_settlement_status,
    gateway_settlement_date
  )
  where gateway_settlement_status = 'pending';

notify pgrst, 'reload schema';
