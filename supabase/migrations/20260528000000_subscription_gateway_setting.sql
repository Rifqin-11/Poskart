-- Migration: Super Admin controlled subscription checkout gateway.

alter table public.app_configs
  add column if not exists subscription_payment_gateway text not null default 'duitku'
  check (subscription_payment_gateway in ('duitku', 'midtrans', 'both'));
