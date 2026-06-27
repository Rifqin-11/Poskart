alter table public.transactions
  drop constraint if exists transactions_provider_check;

alter table public.transactions
  add constraint transactions_provider_check
  check (provider in ('QRIS', 'Cash', 'Voucher'));
