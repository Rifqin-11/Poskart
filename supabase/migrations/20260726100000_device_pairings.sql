-- Device pairing keeps a newly installed kiosk out of the workspace until an
-- owner/admin explicitly configures it from the web dashboard.  This table is
-- server-only: Flutter reaches it through /api/kiosk/device-pairings and the
-- dashboard reaches it through server actions.

create table if not exists public.device_pairings (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  -- The hash is used for lookup/rate limiting. The raw hardware ID is retained
  -- only until pairing completes because it is required to create devices.
  hardware_id_hash text not null,
  hardware_id text not null,
  organization_id text not null references public.organizations(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'configured', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  device_id text references public.devices(id) on delete set null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  regeneration_count integer not null default 0 check (regeneration_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_pairings_hardware_active_idx
  on public.device_pairings (hardware_id_hash, created_at desc);
create index if not exists device_pairings_organization_status_idx
  on public.device_pairings (organization_id, status, expires_at);

alter table public.device_pairings enable row level security;

-- The function is intentionally callable only with the service-role key. It
-- creates the device and consumes the pairing in one database transaction.
create or replace function public.complete_device_pairing(
  p_pairing_id uuid,
  p_organization_id text,
  p_device_id text,
  p_device jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  pairing public.device_pairings%rowtype;
begin
  select * into pairing
  from public.device_pairings
  where id = p_pairing_id
  for update;

  if not found then
    raise exception 'Pairing request was not found.';
  end if;

  if pairing.organization_id <> p_organization_id then
    raise exception 'Pairing request belongs to another organization.';
  end if;

  if pairing.status <> 'pending' then
    raise exception 'This pairing code is no longer available.';
  end if;

  if pairing.expires_at <= now() then
    update public.device_pairings
      set status = 'expired', updated_at = now()
      where id = pairing.id;
    raise exception 'This pairing code has expired.';
  end if;

  if exists (
    select 1 from public.devices where hardware_id = pairing.hardware_id
  ) then
    raise exception 'This physical device is already registered.';
  end if;

  insert into public.devices (
    id, organization_id, hardware_id, name, location, status, battery,
    app_version, last_sync, theme, template, pricing_profile,
    frame_templates, pricing_profiles, session_countdown_seconds,
    payment_countdown_seconds, voucher_enabled, test_voucher_enabled,
    printer_bottom_safe_zone_mm, printer_brightness, printer_contrast,
    printer_dot_density, updated_at
  ) values (
    p_device_id,
    pairing.organization_id,
    pairing.hardware_id,
    coalesce(nullif(trim(p_device ->> 'name'), ''), 'POSKART Booth'),
    coalesce(nullif(trim(p_device ->> 'location'), ''), 'Unassigned'),
    coalesce(nullif(p_device ->> 'status', ''), 'offline'),
    greatest(0, least(100, coalesce((p_device ->> 'battery')::integer, 0))),
    coalesce(p_device ->> 'appVersion', ''),
    coalesce(p_device ->> 'lastSync', ''),
    coalesce(p_device ->> 'theme', ''),
    coalesce(p_device ->> 'template', ''),
    coalesce(p_device ->> 'pricingProfile', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_device -> 'frameTemplates', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_device -> 'pricingProfiles', '[]'::jsonb))), '{}'::text[]),
    nullif(p_device ->> 'sessionCountdownSeconds', '')::integer,
    nullif(p_device ->> 'paymentCountdownSeconds', '')::integer,
    coalesce((p_device ->> 'voucherEnabled')::boolean, false),
    coalesce((p_device ->> 'testVoucherEnabled')::boolean, false),
    coalesce((p_device ->> 'printerBottomSafeZoneMm')::integer, 0),
    coalesce((p_device ->> 'printerBrightness')::integer, 0),
    coalesce((p_device ->> 'printerContrast')::integer, 0),
    coalesce((p_device ->> 'printerDotDensity')::integer, 1),
    now()
  );

  update public.device_pairings
  set status = 'configured',
      claimed_at = now(),
      device_id = p_device_id,
      updated_at = now()
  where id = pairing.id;

  return p_device_id;
end;
$$;

revoke all on function public.complete_device_pairing(uuid, text, text, jsonb)
  from public, anon, authenticated;
