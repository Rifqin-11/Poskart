-- A progress row can be created by any individual feature tour. Keep the
-- original admin-tour marker nullable so completing a feature tour does not
-- accidentally mark the global admin tour as completed.
alter table public.profile_tutorial_progress
  alter column completed_at drop not null,
  alter column completed_at drop default;

alter table public.profile_tutorial_progress
  add column if not exists finance_completed_at timestamptz,
  add column if not exists pricing_completed_at timestamptz,
  add column if not exists devices_completed_at timestamptz,
  add column if not exists gallery_completed_at timestamptz,
  add column if not exists vouchers_completed_at timestamptz;

-- Existing accounts can open every feature tour manually, but are not
-- interrupted by a new automatic tour after this feature launches.
update public.profile_tutorial_progress
set
  finance_completed_at = coalesce(finance_completed_at, now()),
  pricing_completed_at = coalesce(pricing_completed_at, now()),
  devices_completed_at = coalesce(devices_completed_at, now()),
  gallery_completed_at = coalesce(gallery_completed_at, now()),
  vouchers_completed_at = coalesce(vouchers_completed_at, now());
