-- Allow one verified payment to be allocated across multiple withdrawal requests.
-- The payment ledger remains immutable; payout_invoice_items become the
-- allocation ledger for each request.

alter table public.payout_invoice_items
  alter column transaction_id drop not null;

alter table public.payout_invoice_items
  drop constraint if exists payout_invoice_items_transaction_id_key;

drop index if exists public.payout_invoice_items_ledger_entry_id_key;

create or replace function public.validate_payout_invoice_item_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_gross integer;
  ledger_organization_id text;
  ledger_settlement_status text;
  ledger_invoice_id uuid;
  invoice_organization_id text;
  already_allocated integer;
begin
  if new.ledger_entry_id is null then
    return new;
  end if;

  -- Lock the source ledger row so concurrent withdrawal requests cannot both
  -- reserve the same remaining gross amount.
  select
    organization_id,
    gross_amount,
    settlement_status,
    payout_invoice_id
  into
    ledger_organization_id,
    ledger_gross,
    ledger_settlement_status,
    ledger_invoice_id
  from public.payment_ledger_entries
  where id = new.ledger_entry_id
  for update;

  if ledger_gross is null then
    raise exception 'Payout source ledger entry was not found';
  end if;

  select organization_id
  into invoice_organization_id
  from public.payout_invoices
  where id = new.payout_invoice_id;

  if invoice_organization_id is null
    or invoice_organization_id is distinct from ledger_organization_id
  then
    raise exception 'Payout invoice and source ledger belong to different organizations';
  end if;

  -- Older payout rows use these fields as a full-entry lock. They cannot be
  -- mixed with the allocation model.
  if ledger_settlement_status is not null or ledger_invoice_id is not null then
    raise exception 'Payout source ledger entry is already locked';
  end if;

  select coalesce(sum(item.gross_amount), 0)
  into already_allocated
  from public.payout_invoice_items as item
  join public.payout_invoices as invoice
    on invoice.id = item.payout_invoice_id
  where item.ledger_entry_id = new.ledger_entry_id
    and item.id is distinct from new.id
    and invoice.status in ('pending_approval', 'requested', 'approved', 'paid');

  if already_allocated + new.gross_amount > ledger_gross then
    raise exception 'Payout amount exceeds the remaining payment balance';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_payout_invoice_item_allocation
  on public.payout_invoice_items;

create trigger validate_payout_invoice_item_allocation
before insert or update of ledger_entry_id, gross_amount, payout_invoice_id
on public.payout_invoice_items
for each row
execute function public.validate_payout_invoice_item_allocation();

revoke all on function public.validate_payout_invoice_item_allocation() from public, anon;
grant execute on function public.validate_payout_invoice_item_allocation() to authenticated, service_role;

notify pgrst, 'reload schema';
