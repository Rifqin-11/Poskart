alter table public.payment_ledger_entries
  add column if not exists correction_reason text,
  add column if not exists corrected_at timestamptz;

create or replace function public.prevent_payment_ledger_core_update()
returns trigger
language plpgsql
as $$
begin
  if old.organization_id is distinct from new.organization_id
    or old.transaction_id is distinct from new.transaction_id
    or old.provider is distinct from new.provider
    or old.payment_method is distinct from new.payment_method
    or old.collection_mode is distinct from new.collection_mode
    or old.merchant_order_id is distinct from new.merchant_order_id
    or old.duitku_reference is distinct from new.duitku_reference
    or old.gross_amount is distinct from new.gross_amount
    or old.gateway_fee_amount is distinct from new.gateway_fee_amount
    or old.platform_fee_amount is distinct from new.platform_fee_amount
    or old.adjustment_amount is distinct from new.adjustment_amount
    or old.net_amount is distinct from new.net_amount
    or old.booth is distinct from new.booth
    or old.package_name is distinct from new.package_name
    or old.paid_at is distinct from new.paid_at
    or old.verified_at is distinct from new.verified_at
    or old.callback_payload is distinct from new.callback_payload
    or old.verified_response is distinct from new.verified_response
    or old.created_at is distinct from new.created_at
  then
    raise exception 'payment_ledger_entries core fields are immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

update public.payment_ledger_entries
set
  status = 'voided',
  settlement_status = null,
  payout_invoice_id = null,
  correction_reason = 'Excluded legacy backfill from QR creation payload; not verified by Duitku Check Transaction.',
  corrected_at = now(),
  updated_at = now()
where status = 'paid'
  and provider = 'duitku'
  and payment_method = 'QRIS'
  and collection_mode = 'platform'
  and payout_invoice_id is null
  and settlement_status is null
  and (
    verified_response ? 'qrString'
    or verified_response ? 'qr_string'
    or verified_response ? 'paymentUrl'
    or verified_response ? 'payment_url'
  );

notify pgrst, 'reload schema';
