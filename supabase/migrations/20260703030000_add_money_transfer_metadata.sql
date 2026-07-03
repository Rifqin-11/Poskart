alter table public.money_entries
  add column if not exists transfer_group_id uuid,
  add column if not exists transfer_direction text;

alter table public.money_entries
  drop constraint if exists money_entries_transfer_direction_check;

alter table public.money_entries
  add constraint money_entries_transfer_direction_check
  check (
    transfer_direction is null
    or transfer_direction in ('out', 'in')
  );

create index if not exists money_entries_transfer_group_idx
  on public.money_entries (organization_id, transfer_group_id)
  where transfer_group_id is not null;
