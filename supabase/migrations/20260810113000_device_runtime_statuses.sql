-- Device status is reported by the kiosk heartbeat and displayed by Web Admin.
-- `maintenance` remains an owner/admin override, while the other values are
-- transient runtime states that recover on the next healthy heartbeat.

alter table public.devices
  drop constraint if exists booths_status_check;

alter table public.devices
  drop constraint if exists devices_status_check;

alter table public.devices
  add constraint devices_status_check
  check (status in ('online', 'in_session', 'offline', 'error', 'maintenance'));
