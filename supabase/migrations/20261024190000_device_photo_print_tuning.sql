-- Manual print-only controls. Keep the legacy field/API for v2.8.1 kiosks.
alter table public.devices
  add column if not exists printer_dark_smoothing numeric not null default 0 check (printer_dark_smoothing between 0 and 100),
  add column if not exists printer_local_contrast numeric not null default 0 check (printer_local_contrast between 0 and 100),
  add column if not exists printer_background_lift numeric not null default 0 check (printer_background_lift between 0 and 100);

-- Only this migration performs the legacy-value conversion. A later explicit
-- zero must never fall back to the deprecated shadow lift again.
update public.devices set printer_dark_smoothing = printer_shadow_lift
where printer_dark_smoothing = 0 and printer_shadow_lift > 0;

comment on column public.devices.printer_dark_smoothing is 'Manual print-only shadow denoise/floor, 0-100; photo slots only when mask exists.';
comment on column public.devices.printer_local_contrast is 'Manual print-only clipped local contrast (CLAHE), 0-100.';
comment on column public.devices.printer_background_lift is 'Manual print-only person-segmented background lift, 0-100; disabled without photo-slot metadata.';

create or replace function public.complete_device_pairing(
  p_pairing_id uuid, p_organization_id text, p_device_id text, p_device jsonb
)
returns text language plpgsql security definer set search_path = public as $$
declare
  pairing public.device_pairings%rowtype;
  normalized_pin text := trim(coalesce(p_device ->> 'settingsPin', ''));
  should_protect boolean := coalesce((p_device ->> 'protectSettings')::boolean, false);
  requested_layout_id text := nullif(trim(coalesce(p_device ->> 'layoutSchemaId', '')), '');
begin
  select * into pairing from public.device_pairings where id = p_pairing_id for update;
  if not found then raise exception 'Pairing request was not found.'; end if;
  if pairing.organization_id <> p_organization_id then raise exception 'Pairing request belongs to another organization.'; end if;
  if pairing.status <> 'pending' then raise exception 'This pairing code is no longer available.'; end if;
  if pairing.expires_at <= now() then
    update public.device_pairings set status = 'expired', updated_at = now() where id = pairing.id;
    raise exception 'This pairing code has expired.';
  end if;
  if exists (select 1 from public.devices where hardware_id = pairing.hardware_id) then
    raise exception 'This physical device is already registered.';
  end if;
  if should_protect and normalized_pin !~ '^[0-9]{4,12}$' then
    raise exception 'PIN must contain 4 to 12 digits when settings protection is enabled.';
  end if;
  if requested_layout_id is not null and not exists (
    select 1 from public.layout_schemas where id = requested_layout_id and organization_id = pairing.organization_id
  ) then raise exception 'The selected device layout is unavailable.'; end if;

  insert into public.devices (
    id, organization_id, hardware_id, name, location, status, battery,
    app_version, last_sync, theme, layout_schema_id, template, pricing_profile,
    frame_templates, frame_categories_enabled, pricing_profiles,
    session_countdown_seconds, payment_countdown_seconds, voucher_enabled, test_voucher_enabled,
    social_media_consent_enabled, email_delivery_enabled,
    printer_bottom_safe_zone_mm, printer_brightness, printer_contrast,
    printer_dot_density, printer_shadow_lift, printer_dark_smoothing, printer_local_contrast, printer_background_lift,
    settings_pin, protect_settings, updated_at
  ) values (
    p_device_id, pairing.organization_id, pairing.hardware_id,
    coalesce(nullif(trim(p_device ->> 'name'), ''), 'POSKART Booth'),
    coalesce(nullif(trim(p_device ->> 'location'), ''), 'Unassigned'),
    coalesce(nullif(p_device ->> 'status', ''), 'offline'),
    greatest(0, least(100, coalesce((p_device ->> 'battery')::integer, 0))),
    coalesce(p_device ->> 'appVersion', ''), coalesce(p_device ->> 'lastSync', ''),
    coalesce(p_device ->> 'theme', ''), requested_layout_id,
    coalesce(p_device ->> 'template', ''), coalesce(p_device ->> 'pricingProfile', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_device -> 'frameTemplates', '[]'::jsonb))), '{}'::text[]),
    coalesce((p_device ->> 'frameCategoriesEnabled')::boolean, true),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_device -> 'pricingProfiles', '[]'::jsonb))), '{}'::text[]),
    nullif(p_device ->> 'sessionCountdownSeconds', '')::integer,
    nullif(p_device ->> 'paymentCountdownSeconds', '')::integer,
    coalesce((p_device ->> 'voucherEnabled')::boolean, false),
    coalesce((p_device ->> 'testVoucherEnabled')::boolean, false),
    coalesce((p_device ->> 'socialMediaConsentEnabled')::boolean, true),
    coalesce((p_device ->> 'emailDeliveryEnabled')::boolean, true),
    coalesce((p_device ->> 'printerBottomSafeZoneMm')::integer, 0),
    coalesce((p_device ->> 'printerBrightness')::integer, 0),
    coalesce((p_device ->> 'printerContrast')::integer, 0),
    coalesce((p_device ->> 'printerDotDensity')::numeric, 1),
    greatest(0, least(100, coalesce((p_device ->> 'printerShadowLift')::numeric, 0))),
    greatest(0, least(100, coalesce((p_device ->> 'printerDarkSmoothing')::numeric, (p_device ->> 'printerShadowLift')::numeric, 0))),
    greatest(0, least(100, coalesce((p_device ->> 'printerLocalContrast')::numeric, 0))),
    greatest(0, least(100, coalesce((p_device ->> 'printerBackgroundLift')::numeric, 0))),
    case when normalized_pin ~ '^[0-9]{4,12}$' then normalized_pin else '' end,
    should_protect and normalized_pin ~ '^[0-9]{4,12}$', now()
  );
  update public.device_pairings set status = 'configured', claimed_at = now(), device_id = p_device_id, updated_at = now()
  where id = pairing.id;
  return p_device_id;
end;
$$;
revoke all on function public.complete_device_pairing(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_device_pairing(uuid, text, text, jsonb) to service_role;
