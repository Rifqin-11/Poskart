alter table public.devices
  add column if not exists printer_bottom_safe_zone_mm numeric not null default 0,
  add column if not exists printer_brightness numeric not null default 0,
  add column if not exists printer_contrast numeric not null default 0,
  add column if not exists printer_dot_density numeric not null default 1.0;
