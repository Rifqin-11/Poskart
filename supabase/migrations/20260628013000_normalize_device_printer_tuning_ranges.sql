update public.devices
set
  printer_bottom_safe_zone_mm = least(24, greatest(0, coalesce(printer_bottom_safe_zone_mm, 0))),
  printer_brightness = least(100, greatest(-100, coalesce(printer_brightness, 0))),
  printer_contrast = least(100, greatest(-100, coalesce(printer_contrast, 0))),
  printer_dot_density = least(1.5, greatest(0.5, coalesce(printer_dot_density, 1.0)));

alter table public.devices
  drop constraint if exists devices_printer_bottom_safe_zone_mm_range,
  drop constraint if exists devices_printer_brightness_range,
  drop constraint if exists devices_printer_contrast_range,
  drop constraint if exists devices_printer_dot_density_range,
  add constraint devices_printer_bottom_safe_zone_mm_range
    check (printer_bottom_safe_zone_mm between 0 and 24),
  add constraint devices_printer_brightness_range
    check (printer_brightness between -100 and 100),
  add constraint devices_printer_contrast_range
    check (printer_contrast between -100 and 100),
  add constraint devices_printer_dot_density_range
    check (printer_dot_density between 0.5 and 1.5);

