-- Restore kiosk QRIS transactions that were confirmed by Duitku but later
-- overwritten to pending by the generic transaction upsert.

update public.transactions
set
  status = 'paid',
  updated_at = now()
where provider = 'QRIS'
  and status = 'pending'
  and (
    paid_at is not null
    or duitku_status_code = '00'
    or gateway_response ->> 'statusCode' = '00'
    or gateway_response ->> 'resultCode' = '00'
  );
