-- Migration: Subscription duration plans and per-device add-ons

-- Public SaaS plan metadata. `pricing_products` remains reserved for in-kiosk
-- photobooth products such as single print or double print.
alter table public.subscription_plans
  add column if not exists duration_months integer not null default 1 check (duration_months > 0),
  add column if not exists base_price integer not null default 0 check (base_price >= 0),
  add column if not exists included_devices integer not null default 1 check (included_devices >= 1),
  add column if not exists additional_device_price_monthly integer not null default 50000 check (additional_device_price_monthly >= 0),
  add column if not exists is_public boolean not null default false;

insert into public.subscription_plans (
  id,
  name,
  max_devices,
  duration_months,
  base_price,
  included_devices,
  additional_device_price_monthly,
  is_public,
  features,
  updated_at
) values
  (
    'free',
    'Free Account',
    1,
    1,
    0,
    1,
    50000,
    false,
    '{"description":"Internal free workspace"}'::jsonb,
    now()
  ),
  (
    'monthly',
    '1 Month',
    1,
    1,
    50000,
    1,
    50000,
    true,
    '{"included":"1 device","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'quarterly',
    '3 Months',
    1,
    3,
    140000,
    1,
    50000,
    true,
    '{"included":"1 device","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'semiannual',
    '6 Months',
    1,
    6,
    300000,
    1,
    50000,
    true,
    '{"included":"1 device","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'yearly',
    '1 Year',
    1,
    12,
    500000,
    1,
    50000,
    true,
    '{"included":"1 device","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  )
on conflict (id) do update set
  name = excluded.name,
  max_devices = excluded.max_devices,
  duration_months = excluded.duration_months,
  base_price = excluded.base_price,
  included_devices = excluded.included_devices,
  additional_device_price_monthly = excluded.additional_device_price_monthly,
  is_public = excluded.is_public,
  features = excluded.features,
  updated_at = excluded.updated_at;

alter table public.subscription_orders
  add column if not exists duration_months integer not null default 1 check (duration_months > 0),
  add column if not exists device_count integer not null default 1 check (device_count >= 1),
  add column if not exists included_devices integer not null default 1 check (included_devices >= 1),
  add column if not exists additional_devices integer not null default 0 check (additional_devices >= 0),
  add column if not exists additional_device_price_monthly integer not null default 50000 check (additional_device_price_monthly >= 0),
  add column if not exists base_amount integer not null default 0 check (base_amount >= 0),
  add column if not exists additional_device_amount integer not null default 0 check (additional_device_amount >= 0);

update public.subscription_orders
set
  duration_months = case
    when plan_id = 'quarterly' then 3
    when plan_id = 'semiannual' then 6
    when plan_id = 'yearly' then 12
    else 1
  end,
  device_count = greatest(device_count, 1),
  included_devices = 1,
  additional_device_price_monthly = 50000,
  base_amount = case
    when plan_id = 'quarterly' then 140000
    when plan_id = 'semiannual' then 300000
    when plan_id = 'yearly' then 500000
    when plan_id = 'monthly' then 50000
    else amount
  end
where base_amount = 0;
