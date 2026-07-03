alter table public.payout_invoice_items
  drop constraint if exists payout_invoice_items_transaction_id_key;

drop index if exists public.payout_invoice_items_ledger_entry_id_key;

notify pgrst, 'reload schema';
