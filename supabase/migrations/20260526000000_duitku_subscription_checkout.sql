-- Migration: Duitku Sandbox checkout metadata for POSKART subscriptions

alter table public.subscription_orders
  add column if not exists payment_gateway text not null default 'duitku',
  add column if not exists payment_method text,
  add column if not exists merchant_order_id text unique,
  add column if not exists payment_url text,
  add column if not exists payment_reference text,
  add column if not exists gateway_response jsonb;

create index if not exists subscription_orders_merchant_order_id_idx
  on public.subscription_orders (merchant_order_id);
