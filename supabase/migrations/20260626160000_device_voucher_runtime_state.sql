alter table public.devices
  add column if not exists voucher_requested_at timestamptz,
  add column if not exists voucher_command text,
  add column if not exists voucher_command_updated_at timestamptz;

create index if not exists devices_voucher_requested_at_idx
  on public.devices (voucher_requested_at desc)
  where voucher_requested_at is not null;
