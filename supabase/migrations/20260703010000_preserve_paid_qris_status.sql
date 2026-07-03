-- Prevent confirmed Duitku QRIS payments from being downgraded to pending/failed
-- by later kiosk transaction upserts. Refunds are intentionally still allowed.

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
    transaction_status = 'paid'
    or transaction_paid_at is not null
    or transaction_gateway_response ->> 'resultCode' = '00'
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

create or replace function public.preserve_paid_qris_transaction_status()
returns trigger
language plpgsql
as $$
begin
  if new.provider = 'QRIS'
    and new.status in ('pending', 'failed')
    and (
      public.is_confirmed_duitku_qris_payment(
        new.status,
        new.paid_at,
        new.duitku_status_code,
        new.gateway_response
      )
      or (
        tg_op = 'UPDATE'
        and old.provider = 'QRIS'
        and public.is_confirmed_duitku_qris_payment(
          old.status,
          old.paid_at,
          old.duitku_status_code,
          old.gateway_response
        )
      )
    )
  then
    new.status := 'paid';
    if tg_op = 'UPDATE' then
      new.paid_at := coalesce(new.paid_at, old.paid_at);
      new.duitku_status_code := coalesce(
        new.duitku_status_code,
        old.duitku_status_code
      );
      new.gateway_response := coalesce(
        new.gateway_response,
        old.gateway_response
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_paid_qris_transaction_status
  on public.transactions;

create trigger preserve_paid_qris_transaction_status
before insert or update on public.transactions
for each row
execute function public.preserve_paid_qris_transaction_status();

update public.transactions
set
  status = 'paid',
  updated_at = now()
where provider = 'QRIS'
  and status in ('pending', 'failed')
  and public.is_confirmed_duitku_qris_payment(
    status,
    paid_at,
    duitku_status_code,
    gateway_response
  );
