alter table public.money_entries
  add column if not exists fee_percentage numeric(5, 2) not null default 0;

alter table public.money_entries
  drop constraint if exists money_entries_fee_percentage_check;

alter table public.money_entries
  add constraint money_entries_fee_percentage_check
  check (
    fee_percentage between 0 and 100
    and (
      fee_percentage = 0
      or (wallet_type = 'qris' and entry_type = 'income')
    )
  );

notify pgrst, 'reload schema';
