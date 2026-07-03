-- Duitku QR creation returns statusCode = '00' when the QR is created.
-- That payload still contains qrString/paymentUrl and must not be treated as a
-- paid transaction. Only real paid callbacks/status checks should protect paid
-- state from later kiosk upserts.

create or replace function public.is_confirmed_duitku_qris_payment(
  transaction_status text,
  transaction_paid_at timestamptz,
  transaction_duitku_status_code text,
  transaction_gateway_response jsonb
)
returns boolean
language sql
immutable
as $$
  select coalesce((
    transaction_paid_at is not null
    or transaction_gateway_response ->> 'resultCode' = '00'
    or transaction_gateway_response -> 'verified' ->> 'resultCode' = '00'
    or (
      transaction_duitku_status_code = '00'
      and transaction_gateway_response ->> 'statusCode' = '00'
      and transaction_gateway_response ->> 'qrString' is null
      and transaction_gateway_response ->> 'qr_string' is null
      and transaction_gateway_response ->> 'paymentUrl' is null
      and transaction_gateway_response ->> 'payment_url' is null
    )
  ), false)
$$;

update public.transactions
set
  status = 'failed',
  paid_at = null,
  duitku_status_code = null,
  duitku_status_message = 'QR created but no paid confirmation from Duitku',
  updated_at = now()
where provider = 'QRIS'
  and status = 'paid'
  and paid_at is null
  and coalesce(gateway_response ->> 'resultCode', '') <> '00'
  and coalesce(gateway_response -> 'verified' ->> 'resultCode', '') <> '00'
  and (
    gateway_response ->> 'qrString' is not null
    or gateway_response ->> 'qr_string' is not null
    or gateway_response ->> 'paymentUrl' is not null
    or gateway_response ->> 'payment_url' is not null
  );

update public.payment_ledger_entries
set
  status = 'voided',
  updated_at = now()
where status = 'paid'
  and coalesce(verified_response ->> 'resultCode', '') <> '00'
  and (
    verified_response ->> 'qrString' is not null
    or verified_response ->> 'qr_string' is not null
    or verified_response ->> 'paymentUrl' is not null
    or verified_response ->> 'payment_url' is not null
  )
  and payout_invoice_id is null;
