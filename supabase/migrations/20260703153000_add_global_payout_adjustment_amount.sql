alter table public.app_configs
  add column if not exists payout_adjustment_amount integer not null default 0;

notify pgrst, 'reload schema';
