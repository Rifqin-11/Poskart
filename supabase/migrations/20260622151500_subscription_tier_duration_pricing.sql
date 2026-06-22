-- Migration: Subscription tier and duration pricing matrix
-- Public pricing now uses package tiers (Starter, Growth, Business) across
-- 1, 3, 6, and 12 month durations. Old duration-only plan IDs are kept for
-- historical subscriptions/orders but hidden from public checkout.

update public.subscription_plans
set
  is_public = false,
  updated_at = now()
where id in ('starter', 'growth', 'monthly', 'quarterly', 'semiannual', 'yearly', 'business', 'enterprise');

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
    'starter-monthly',
    'Starter',
    1,
    1,
    50000,
    1,
    50000,
    true,
    '{"tier":"starter","included":"1 device","duration":"1 month","audience":"Operator baru / coba-coba","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'starter-quarterly',
    'Starter',
    1,
    3,
    140000,
    1,
    50000,
    true,
    '{"tier":"starter","included":"1 device","duration":"3 months","audience":"Operator baru / coba-coba","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'starter-semiannual',
    'Starter',
    1,
    6,
    270000,
    1,
    50000,
    true,
    '{"tier":"starter","included":"1 device","duration":"6 months","audience":"Operator baru / coba-coba","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'starter-yearly',
    'Starter',
    1,
    12,
    480000,
    1,
    50000,
    true,
    '{"tier":"starter","included":"1 device","duration":"12 months","audience":"Operator baru / coba-coba","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'growth-monthly',
    'Growth',
    3,
    1,
    140000,
    3,
    50000,
    true,
    '{"tier":"growth","included":"3 devices","duration":"1 month","audience":"Operator kecil-menengah","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'growth-quarterly',
    'Growth',
    3,
    3,
    390000,
    3,
    50000,
    true,
    '{"tier":"growth","included":"3 devices","duration":"3 months","audience":"Operator kecil-menengah","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'growth-semiannual',
    'Growth',
    3,
    6,
    740000,
    3,
    50000,
    true,
    '{"tier":"growth","included":"3 devices","duration":"6 months","audience":"Operator kecil-menengah","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'growth-yearly',
    'Growth',
    3,
    12,
    1350000,
    3,
    50000,
    true,
    '{"tier":"growth","included":"3 devices","duration":"12 months","audience":"Operator kecil-menengah","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'business-monthly',
    'Business',
    5,
    1,
    225000,
    5,
    50000,
    true,
    '{"tier":"business","included":"5 devices","duration":"1 month","audience":"Operator aktif / banyak event","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'business-quarterly',
    'Business',
    5,
    3,
    625000,
    5,
    50000,
    true,
    '{"tier":"business","included":"5 devices","duration":"3 months","audience":"Operator aktif / banyak event","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'business-semiannual',
    'Business',
    5,
    6,
    1190000,
    5,
    50000,
    true,
    '{"tier":"business","included":"5 devices","duration":"6 months","audience":"Operator aktif / banyak event","addon":"Rp 50K/device/month"}'::jsonb,
    now()
  ),
  (
    'business-yearly',
    'Business',
    5,
    12,
    2160000,
    5,
    50000,
    true,
    '{"tier":"business","included":"5 devices","duration":"12 months","audience":"Operator aktif / banyak event","addon":"Rp 50K/device/month"}'::jsonb,
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
