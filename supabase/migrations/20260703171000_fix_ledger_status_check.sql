-- 20260703171000_fix_ledger_status_check.sql

alter table public.payment_ledger_entries
  drop constraint if exists payment_ledger_entries_settlement_status_check;

alter table public.payment_ledger_entries
  add constraint payment_ledger_entries_settlement_status_check
  check (
    settlement_status is null
    or settlement_status in ('pending_approval', 'requested', 'approved', 'paid')
  );

notify pgrst, 'reload schema';
