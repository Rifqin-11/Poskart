alter table public.devices
  add column if not exists voucher_enabled boolean not null default false,
  add column if not exists test_voucher_enabled boolean not null default false;

-- Existing device-scoped allocations must remain redeemable after this setting
-- becomes explicit. Devices without an allocation stay disabled by default.
update public.devices as device
set voucher_enabled = true
where exists (
  select 1
  from public.voucher_allocations as allocation
  where allocation.device_id = device.id
    and allocation.organization_id = device.organization_id
);

alter table public.devices
  add constraint devices_test_voucher_requires_voucher_enabled
  check (not test_voucher_enabled or voucher_enabled);
