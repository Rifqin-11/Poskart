-- Migration: Subscription included device rules
-- Updates public SaaS plan metadata only. Existing subscriptions keep their
-- current subscriptions.device_limit so paid/custom limits are not changed.

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
    3,
    6,
    300000,
    3,
    50000,
    true,
    '{"included":"3 devices","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'yearly',
    '1 Year',
    5,
    12,
    500000,
    5,
    50000,
    true,
    '{"included":"5 devices","addon":"Rp 50K/device/month"}'::jsonb,
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
