alter table public.money_entries
  add column if not exists wallet_type text not null default 'cash';

alter table public.money_entries
  drop constraint if exists money_entries_wallet_type_check;

alter table public.money_entries
  add constraint money_entries_wallet_type_check
  check (wallet_type in ('cash', 'qris'));

create index if not exists money_entries_organization_wallet_occurred_at_idx
  on public.money_entries (organization_id, wallet_type, occurred_at desc);

notify pgrst, 'reload schema';
