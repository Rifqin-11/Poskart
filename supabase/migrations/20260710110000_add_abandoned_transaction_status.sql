alter table public.transactions
  drop constraint if exists transactions_payout_status_check;

alter table public.transactions
  add constraint transactions_payout_status_check
  check (
    payout_status is null
    or payout_status in (
      'testing',
      'abandoned',
      'pending_approval',
      'requested',
      'approved',
      'paid'
    )
  );

alter table public.payment_ledger_entries
  drop constraint if exists payment_ledger_entries_settlement_status_check;

alter table public.payment_ledger_entries
  add constraint payment_ledger_entries_settlement_status_check
  check (
    settlement_status is null
    or settlement_status in (
      'testing',
      'abandoned',
      'pending_approval',
      'requested',
      'approved',
      'paid'
    )
  );

notify pgrst, 'reload schema';
