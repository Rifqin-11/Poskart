alter table public.templates
  add column if not exists print_length_mm numeric not null default 150
  check (print_length_mm >= 20 and print_length_mm <= 1000);

alter table public.devices
  add column if not exists paper_roll_type text,
  add column if not exists paper_initial_length_mm numeric,
  add column if not exists paper_used_length_mm numeric,
  add column if not exists paper_installed_at timestamptz,
  add column if not exists paper_updated_at timestamptz;

alter table public.devices
  add constraint devices_paper_lengths_valid check (
    (paper_initial_length_mm is null and paper_used_length_mm is null)
    or (
      paper_initial_length_mm between 1000 and 500000
      and paper_used_length_mm between 0 and paper_initial_length_mm
    )
  );
