-- Device configuration must reference stable record identities. Display names
-- remain in legacy device columns only as a compatibility snapshot for older
-- kiosk clients and existing admin views.

alter table public.devices
  add column if not exists layout_schema_id text
    references public.layout_schemas(id) on delete set null;

create index if not exists devices_organization_layout_schema_idx
  on public.devices (organization_id, layout_schema_id)
  where layout_schema_id is not null;

-- Pricing products are currently a global catalog. The organization_id here
-- scopes an assignment through its device; it is not copied from the product.
create table if not exists public.device_pricing_products (
  device_id text not null references public.devices(id) on delete cascade,
  pricing_product_id text not null references public.pricing_products(id) on delete restrict,
  organization_id text not null references public.organizations(id) on delete cascade,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  primary key (device_id, pricing_product_id)
);

create index if not exists device_pricing_products_device_order_idx
  on public.device_pricing_products (device_id, display_order);
create index if not exists device_pricing_products_organization_product_idx
  on public.device_pricing_products (organization_id, pricing_product_id);

alter table public.device_pricing_products enable row level security;

drop policy if exists "Manage device pricing products" on public.device_pricing_products;
create policy "Manage device pricing products" on public.device_pricing_products
  for all to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  )
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.device_pricing_products to authenticated;

create or replace function public.validate_device_layout_schema_organization()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  layout_organization_id text;
begin
  if new.layout_schema_id is null then
    return new;
  end if;

  select organization_id into layout_organization_id
  from public.layout_schemas
  where id = new.layout_schema_id;

  if layout_organization_id is null
    or layout_organization_id <> new.organization_id then
    raise exception 'Device layout must belong to the same organization';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_device_layout_schema_organization on public.devices;
create trigger validate_device_layout_schema_organization
  before insert or update of layout_schema_id, organization_id on public.devices
  for each row execute function public.validate_device_layout_schema_organization();

create or replace function public.sync_device_layout_snapshot_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.devices
    set theme = new.name,
        updated_at = now()
    where layout_schema_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_device_layout_snapshot_name on public.layout_schemas;
create trigger sync_device_layout_snapshot_name
  after update of name on public.layout_schemas
  for each row execute function public.sync_device_layout_snapshot_name();

create or replace function public.validate_device_pricing_product_organization()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  device_organization_id text;
begin
  select organization_id into device_organization_id
  from public.devices
  where id = new.device_id;

  if device_organization_id is null
    or new.organization_id <> device_organization_id
    or not exists (
      select 1
      from public.pricing_products
      where id = new.pricing_product_id
    ) then
    raise exception 'Device pricing assignment is invalid for this device';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_device_pricing_product_organization
  on public.device_pricing_products;
create trigger validate_device_pricing_product_organization
  before insert or update on public.device_pricing_products
  for each row execute function public.validate_device_pricing_product_organization();

-- Backfill per-device layouts where a current layout can be identified by the
-- old name. Renamed layouts that cannot be resolved remain unassigned rather
-- than being guessed incorrectly.
update public.devices as device
set layout_schema_id = (
      select layout.id
      from public.layout_schemas as layout
      where layout.organization_id = device.organization_id
        and layout.name = nullif(trim(device.theme), '')
      order by layout.updated_at desc, layout.id
      limit 1
    ),
    updated_at = now()
where device.layout_schema_id is null
  and exists (
    select 1
    from public.layout_schemas as layout
    where layout.organization_id = device.organization_id
      and layout.name = nullif(trim(device.theme), '')
  );

-- Backfill pricing identities. The legacy columns are then rewritten with IDs
-- for compatibility with kiosk versions that have not moved to the relation.
with legacy_assignments as (
  select
    device.organization_id,
    device.id as device_id,
    assignment.value as legacy_value,
    assignment.ordinality::integer - 1 as display_order
  from public.devices as device
  cross join lateral unnest(
    case
      when coalesce(array_length(device.pricing_profiles, 1), 0) > 0
        then device.pricing_profiles
      when nullif(trim(coalesce(device.pricing_profile, '')), '') is not null
        then array[device.pricing_profile]
      else array[]::text[]
    end
  ) with ordinality as assignment(value, ordinality)
), matched_by_id as (
  select
    legacy.organization_id,
    legacy.device_id,
    product.id as pricing_product_id,
    min(legacy.display_order) as display_order
  from legacy_assignments as legacy
  join public.pricing_products as product
    on product.id = legacy.legacy_value
  group by legacy.organization_id, legacy.device_id, product.id
), matched_by_unique_name as (
  select
    legacy.organization_id,
    legacy.device_id,
    product.id as pricing_product_id,
    min(legacy.display_order) as display_order
  from legacy_assignments as legacy
  join public.pricing_products as product
    on product.name = legacy.legacy_value
  where not exists (
    select 1
    from public.pricing_products as id_match
    where id_match.id = legacy.legacy_value
  )
    and 1 = (
      select count(*)
      from public.pricing_products as matching_name
      where matching_name.name = legacy.legacy_value
    )
  group by legacy.organization_id, legacy.device_id, product.id
), matched_assignments as (
  select * from matched_by_id
  union all
  select * from matched_by_unique_name
)
insert into public.device_pricing_products (
  device_id,
  pricing_product_id,
  organization_id,
  display_order
)
select device_id, pricing_product_id, organization_id, display_order
from matched_assignments
on conflict (device_id, pricing_product_id) do update
  set display_order = excluded.display_order;

update public.devices as device
set pricing_profiles = relation.pricing_product_ids,
    pricing_profile = coalesce(relation.pricing_product_ids[1], ''),
    updated_at = now()
from (
  select
    device_id,
    array_agg(pricing_product_id order by display_order, pricing_product_id)
      as pricing_product_ids
  from public.device_pricing_products
  group by device_id
) as relation
where device.id = relation.device_id;

create or replace function public.set_device_pricing_products(
  target_device_id text,
  target_pricing_product_ids text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_organization_id text;
  matching_product_count integer;
  distinct_product_count integer;
  event_product_count integer;
begin
  select organization_id into target_organization_id
  from public.devices
  where id = target_device_id;

  if target_organization_id is null then
    raise exception 'Device % was not found or cannot be configured', target_device_id;
  end if;

  if not public.is_auth_admin() and not exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin', 'designer')
  ) then
    raise exception 'You are not allowed to configure this device';
  end if;

  select count(distinct pricing_product_id)
    into distinct_product_count
  from unnest(coalesce(target_pricing_product_ids, array[]::text[]))
    as input(pricing_product_id);

  select count(*), count(*) filter (where access_mode = 'event')
    into matching_product_count, event_product_count
  from public.pricing_products
  where active = true
    and id = any(coalesce(target_pricing_product_ids, array[]::text[]));

  if matching_product_count <> distinct_product_count then
    raise exception 'One or more pricing products are unavailable';
  end if;
  if event_product_count > 1 then
    raise exception 'Only one event product can be assigned to a device';
  end if;

  delete from public.device_pricing_products
  where device_id = target_device_id;

  insert into public.device_pricing_products (
    device_id,
    pricing_product_id,
    organization_id,
    display_order
  )
  select
    target_device_id,
    input.pricing_product_id,
    target_organization_id,
    min(input.ordinality)::integer - 1
  from unnest(coalesce(target_pricing_product_ids, array[]::text[]))
    with ordinality as input(pricing_product_id, ordinality)
  group by input.pricing_product_id;

  update public.devices
  set pricing_profiles = coalesce(target_pricing_product_ids, array[]::text[]),
      pricing_profile = coalesce(target_pricing_product_ids[1], ''),
      updated_at = now()
  where id = target_device_id
    and organization_id = target_organization_id;
end;
$$;

grant execute on function public.set_device_pricing_products(text, text[]) to authenticated;

-- Pairing remains atomic while receiving normalized IDs from the admin flow.
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
    select 1 from public.layout_schemas
    where id = requested_layout_id and organization_id = pairing.organization_id
  ) then
    raise exception 'The selected device layout is unavailable.';
  end if;

  insert into public.devices (
    id, organization_id, hardware_id, name, location, status, battery,
    app_version, last_sync, theme, layout_schema_id, template, pricing_profile,
    frame_templates, pricing_profiles, session_countdown_seconds,
    payment_countdown_seconds, voucher_enabled, test_voucher_enabled,
    printer_bottom_safe_zone_mm, printer_brightness, printer_contrast,
    printer_dot_density, settings_pin, protect_settings, updated_at
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
    coalesce(array(select jsonb_array_elements_text(coalesce(p_device -> 'pricingProfiles', '[]'::jsonb))), '{}'::text[]),
    nullif(p_device ->> 'sessionCountdownSeconds', '')::integer,
    nullif(p_device ->> 'paymentCountdownSeconds', '')::integer,
    coalesce((p_device ->> 'voucherEnabled')::boolean, false),
    coalesce((p_device ->> 'testVoucherEnabled')::boolean, false),
    coalesce((p_device ->> 'printerBottomSafeZoneMm')::integer, 0),
    coalesce((p_device ->> 'printerBrightness')::integer, 0),
    coalesce((p_device ->> 'printerContrast')::integer, 0),
    coalesce((p_device ->> 'printerDotDensity')::integer, 1),
    case when normalized_pin ~ '^[0-9]{4,12}$' then normalized_pin else '' end,
    should_protect and normalized_pin ~ '^[0-9]{4,12}$', now()
  );

  update public.device_pairings
  set status = 'configured', claimed_at = now(), device_id = p_device_id, updated_at = now()
  where id = pairing.id;
  return p_device_id;
end;
$$;

revoke all on function public.complete_device_pairing(uuid, text, text, jsonb)
  from public, anon, authenticated;
