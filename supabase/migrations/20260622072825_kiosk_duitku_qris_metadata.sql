-- Store Duitku QRIS metadata for native Flutter kiosk payments.

alter table public.transactions
  add column if not exists payment_gateway text,
  add column if not exists merchant_order_id text,
  add column if not exists payment_reference text,
  add column if not exists payment_url text,
  add column if not exists duitku_qr_string text,
  add column if not exists duitku_status_code text,
  add column if not exists duitku_status_message text,
  add column if not exists payment_expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists gateway_status_checked_at timestamptz,
  add column if not exists gateway_response jsonb;

create unique index if not exists transactions_merchant_order_id_key
  on public.transactions (merchant_order_id)
  where merchant_order_id is not null;

create index if not exists transactions_payment_reference_idx
  on public.transactions (payment_reference)
  where payment_reference is not null;
