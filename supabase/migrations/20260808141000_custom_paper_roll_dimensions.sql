alter table public.devices
  add column if not exists paper_outer_diameter_mm numeric,
  add column if not exists paper_core_diameter_mm numeric;

alter table public.devices
  add constraint devices_paper_diameters_valid check (
    (paper_outer_diameter_mm is null and paper_core_diameter_mm is null)
    or (
      paper_outer_diameter_mm between 10 and 200
      and paper_core_diameter_mm between 1 and paper_outer_diameter_mm - 1
    )
  );
