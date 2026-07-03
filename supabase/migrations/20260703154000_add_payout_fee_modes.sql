alter table public.app_configs
  add column if not exists gateway_fee_type text not null default 'percentage',
  add column if not exists gateway_fee_fixed_amount integer not null default 0,
  add column if not exists platform_fee_type text not null default 'percentage',
  add column if not exists platform_fee_fixed_amount integer not null default 0;

alter table public.app_configs
  drop constraint if exists app_configs_gateway_fee_type_check,
  drop constraint if exists app_configs_platform_fee_type_check,
  drop constraint if exists app_configs_gateway_fee_fixed_amount_check,
  drop constraint if exists app_configs_platform_fee_fixed_amount_check;

alter table public.app_configs
  add constraint app_configs_gateway_fee_type_check
  check (gateway_fee_type in ('percentage', 'fixed')),
  add constraint app_configs_platform_fee_type_check
  check (platform_fee_type in ('percentage', 'fixed')),
  add constraint app_configs_gateway_fee_fixed_amount_check
  check (gateway_fee_fixed_amount >= 0),
  add constraint app_configs_platform_fee_fixed_amount_check
  check (platform_fee_fixed_amount >= 0);

notify pgrst, 'reload schema';
