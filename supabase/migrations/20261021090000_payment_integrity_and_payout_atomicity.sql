-- Apply in staging and run payment-integrity integration tests before production.
-- No historical balance changes or automatic orphan attribution.
begin;

create table public.payment_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),
  issue_key text not null unique,
  merchant_order_id text not null,
  organization_id text references public.organizations(id),
  kind text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  evidence jsonb not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text
);
create index payment_reconciliation_issues_open_idx on public.payment_reconciliation_issues(status,last_seen_at);
alter table public.payment_reconciliation_issues enable row level security;
create policy "Platform admins can inspect reconciliation" on public.payment_reconciliation_issues
  for select to authenticated using (public.is_auth_admin());
revoke all on public.payment_reconciliation_issues from public, anon, authenticated;
grant select on public.payment_reconciliation_issues to authenticated;
grant all on public.payment_reconciliation_issues to service_role;

create table public.payment_financial_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id),
  entity_type text not null,
  entity_id text not null,
  actor_id uuid,
  before_state jsonb,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.payment_financial_audit enable row level security;
create policy "Platform admins can inspect financial audit" on public.payment_financial_audit
  for select to authenticated using (public.is_auth_admin());
revoke all on public.payment_financial_audit from public, anon, authenticated;
grant select on public.payment_financial_audit to authenticated, service_role;

-- Only backend code which has independently verified Duitku may call this.
-- Ledger insertion and payment finalization either both commit or both roll back.
create function public.finalize_verified_duitku_payment(p_transaction_id text, p_ledger jsonb, p_verified jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  tx public.transactions%rowtype;
  existing public.payment_ledger_entries%rowtype;
  result_id uuid;
  ref text := nullif(p_verified->>'reference','');
begin
  select * into tx from public.transactions where id=p_transaction_id for update;
  if not found then raise exception 'Payment order not found'; end if;
  if tx.provider is distinct from 'QRIS' or tx.payment_gateway is distinct from 'duitku'
    or tx.merchant_order_id is distinct from p_verified->>'merchantOrderId'
    or p_verified->>'statusCode' is distinct from '00'
    or (p_verified->>'amount') is null or (p_verified->>'amount')::numeric <> tx.amount
    or ref is null
    or (tx.payment_reference is not null and tx.payment_reference <> ref)
    or tx.status = 'refunded'
  then raise exception 'Verified payment identity, amount or state mismatch'; end if;

  if tx.collection_mode = 'platform' then
    if p_ledger is null or p_ledger->>'organization_id' is distinct from tx.organization_id
      or p_ledger->>'merchant_order_id' is distinct from tx.merchant_order_id
      or p_ledger->>'transaction_id' is distinct from tx.id
      or p_ledger->>'duitku_reference' is distinct from ref
      or (p_ledger->>'gross_amount')::numeric is distinct from tx.amount
      or (p_ledger->>'gateway_fee_amount')::numeric < 0
      or (p_ledger->>'platform_fee_amount')::numeric <> 0
      or (p_ledger->>'adjustment_amount')::numeric <> 0
      or (p_ledger->>'net_amount')::numeric is distinct from
        greatest(0,tx.amount-(p_ledger->>'gateway_fee_amount')::numeric)
    then raise exception 'Invalid payment ledger snapshot'; end if;

    select * into existing from public.payment_ledger_entries where merchant_order_id=tx.merchant_order_id for update;
    if found then
      if existing.organization_id <> tx.organization_id or existing.transaction_id is distinct from tx.id
        or existing.gross_amount <> tx.amount or existing.duitku_reference is distinct from ref
        or existing.status <> 'paid'
      then raise exception 'Existing ledger conflicts with verified payment'; end if;
      result_id := existing.id;
      -- Never replace the original fee/paid_at or reset payout reservations on retry.
      if existing.gateway_settlement_date is null and nullif(p_ledger->>'gateway_settlement_date','') is not null then
        update public.payment_ledger_entries set
          gateway_settlement_date=(p_ledger->>'gateway_settlement_date')::date,
          gateway_settlement_status=p_ledger->>'gateway_settlement_status',
          gateway_balance_available_at=(p_ledger->>'gateway_balance_available_at')::timestamptz
        where id=result_id;
      end if;
    else
      insert into public.payment_ledger_entries (
        organization_id,transaction_id,provider,payment_method,collection_mode,merchant_order_id,duitku_reference,
        status,gateway_settlement_status,gateway_settlement_date,gateway_balance_available_at,
        gross_amount,gateway_fee_amount,platform_fee_amount,adjustment_amount,net_amount,
        booth,package_name,paid_at,callback_payload,verified_response
      ) values (
        tx.organization_id,tx.id,'duitku','QRIS','platform',tx.merchant_order_id,ref,'paid',
        p_ledger->>'gateway_settlement_status',(p_ledger->>'gateway_settlement_date')::date,
        (p_ledger->>'gateway_balance_available_at')::timestamptz,
        tx.amount,(p_ledger->>'gateway_fee_amount')::integer,0,0,(p_ledger->>'net_amount')::integer,
        tx.booth,tx.package_name,coalesce(tx.paid_at,now()),coalesce(p_ledger->'callback_payload','{}'),p_verified
      ) returning id into result_id;
    end if;
  end if;

  update public.transactions set status='paid', payment_reference=ref, duitku_status_code='00',
    duitku_status_message='SUCCESS',gateway_status_checked_at=now(),gateway_response=p_verified,
    paid_at=coalesce(paid_at,now()),updated_at=now() where id=tx.id;
  insert into public.payment_financial_audit(organization_id,entity_type,entity_id,before_state,after_state)
    select tx.organization_id,'payment',tx.id,jsonb_build_object('status',tx.status),
      jsonb_build_object('status','paid','merchantOrderId',tx.merchant_order_id,'ledgerId',result_id)
    where tx.status is distinct from 'paid' or (existing.id is null and result_id is not null);
  return result_id;
end $$;
revoke all on function public.finalize_verified_duitku_payment(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_verified_duitku_payment(text,jsonb,jsonb) to service_role;

-- Strengthen the existing partial-allocation model; preserve its ledger row lock.
create or replace function public.validate_payout_invoice_item_allocation()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  l public.payment_ledger_entries%rowtype;
  inv public.payout_invoices%rowtype;
  allocated_gross bigint;
  allocated_fee bigint;
begin
  if new.ledger_entry_id is null then raise exception 'Verified ledger is required for new payout allocations'; end if;
  select * into l from public.payment_ledger_entries where id=new.ledger_entry_id for update;
  if not found then raise exception 'Payout ledger not found'; end if;
  select * into inv from public.payout_invoices where id=new.payout_invoice_id;
  if not found or inv.organization_id is distinct from l.organization_id
    or new.organization_id is distinct from l.organization_id
    or new.transaction_id is distinct from l.transaction_id
    or inv.status not in ('pending_approval','requested')
    or l.status <> 'paid' or l.provider <> 'duitku' or l.collection_mode <> 'platform'
    or l.payment_method <> 'QRIS' or l.gateway_settlement_status <> 'settled'
    or l.settlement_status is not null or l.payout_invoice_id is not null
    or not (l.verified_response ? 'reference' or l.verified_response->>'statusCode'='00'
      or l.verified_response->>'resultCode'='00' or l.verified_response->>'status'='SUCCESS')
    or l.verified_response ?| array['qrString','qr_string','paymentUrl','payment_url']
  then raise exception 'Payout source is ineligible or belongs to another organization'; end if;
  select coalesce(sum(i.gross_amount),0),coalesce(sum(i.gateway_fee_amount),0)
    into allocated_gross,allocated_fee from public.payout_invoice_items i
    join public.payout_invoices p on p.id=i.payout_invoice_id
    where i.ledger_entry_id=l.id and i.id is distinct from new.id
    and p.status in ('pending_approval','requested','approved','paid');
  if new.gross_amount <= 0 or allocated_gross+new.gross_amount > l.gross_amount
    or new.gateway_fee_amount < 0 or allocated_fee+new.gateway_fee_amount > l.gateway_fee_amount
    or new.platform_fee_amount <> 0
    or new.net_amount <> new.gross_amount-new.gateway_fee_amount
    or new.gateway_fee_amount <> case when allocated_gross+new.gross_amount=l.gross_amount
      then l.gateway_fee_amount-allocated_fee
      else round(new.gross_amount::numeric*(l.gateway_fee_amount-allocated_fee)/(l.gross_amount-allocated_gross))::integer end
  then raise exception 'Payout allocation exceeds verified gross/fee balance'; end if;
  return new;
end $$;
drop trigger validate_payout_invoice_item_allocation on public.payout_invoice_items;
create trigger validate_payout_invoice_item_allocation before insert or update on public.payout_invoice_items
  for each row execute function public.validate_payout_invoice_item_allocation();

-- Insert the invoice and all allocations atomically. A failed item rolls back everything.
alter table public.payout_invoices add column request_key uuid;
create unique index payout_invoices_request_key_idx on public.payout_invoices(organization_id,request_key) where request_key is not null;
create function public.create_reserved_payout(p_invoice jsonb,p_items jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare inv public.payout_invoices%rowtype; item jsonb; account public.organization_payout_accounts%rowtype; prior public.payout_invoices%rowtype;
begin
  inv:=jsonb_populate_record(null::public.payout_invoices,p_invoice);
  perform pg_advisory_xact_lock(hashtextextended('payout:'||inv.organization_id,0));
  if inv.request_key is null then raise exception 'Payout request key required'; end if;
  select * into prior from public.payout_invoices where organization_id=inv.organization_id and request_key=inv.request_key;
  if found then
    if prior.requested_amount <> inv.requested_amount or prior.payout_account_id is distinct from inv.payout_account_id
      or prior.requested_by is distinct from inv.requested_by then raise exception 'Payout request key conflict'; end if;
    return prior.id;
  end if;
  if inv.status not in ('pending_approval','requested') or inv.gross_amount <= 0
    or jsonb_array_length(p_items)=0 or inv.requested_amount <> inv.gross_amount
    or inv.gross_amount <> (select sum((x->>'gross_amount')::integer) from jsonb_array_elements(p_items) x)
    or inv.gateway_fee_amount <> (select sum((x->>'gateway_fee_amount')::integer) from jsonb_array_elements(p_items) x)
    or inv.adjustment_amount <> 0
    or inv.net_amount <> greatest(0,inv.gross_amount-inv.gateway_fee_amount-inv.platform_fee_amount)
  then raise exception 'Invalid payout totals'; end if;
  select * into account from public.organization_payout_accounts where id=inv.payout_account_id for share;
  if not found or account.organization_id <> inv.organization_id then raise exception 'Invalid payout account'; end if;
  if not exists(select 1 from public.organization_members where organization_id=inv.organization_id
    and profile_id=inv.requested_by and role in ('owner','admin','akuntan'))
  then raise exception 'Payout requester is not an organization manager'; end if;
  insert into public.payout_invoices(request_key,invoice_number,organization_id,payout_account_id,status,gross_amount,
    gateway_fee_amount,platform_fee_amount,adjustment_amount,net_amount,requested_amount,requested_by,
    requested_at,notes,account_snapshot,fee_snapshot)
  values(inv.request_key,inv.invoice_number,inv.organization_id,inv.payout_account_id,inv.status,inv.gross_amount,
    inv.gateway_fee_amount,inv.platform_fee_amount,0,inv.net_amount,inv.requested_amount,inv.requested_by,
    now(),inv.notes,jsonb_build_object('bankName',account.bank_name,'accountNumber',account.account_number,
    'accountHolderName',account.account_holder_name),inv.fee_snapshot) returning id into inv.id;
  for item in select value from jsonb_array_elements(p_items) order by value->>'ledger_entry_id' loop
    insert into public.payout_invoice_items(payout_invoice_id,organization_id,ledger_entry_id,transaction_id,
      payment_gateway,booth,package_name,transaction_paid_at,gross_amount,gateway_fee_amount,platform_fee_amount,net_amount)
    values(inv.id,inv.organization_id,(item->>'ledger_entry_id')::uuid,item->>'transaction_id',item->>'payment_gateway',
      item->>'booth',item->>'package_name',(item->>'transaction_paid_at')::timestamptz,
      (item->>'gross_amount')::integer,(item->>'gateway_fee_amount')::integer,0,(item->>'net_amount')::integer);
  end loop;
  insert into public.payment_financial_audit(organization_id,entity_type,entity_id,actor_id,after_state)
    values(inv.organization_id,'payout',inv.id::text,inv.requested_by,jsonb_build_object('status',inv.status,'gross',inv.gross_amount));
  return inv.id;
end $$;
revoke all on function public.create_reserved_payout(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_reserved_payout(jsonb,jsonb) to service_role;

-- All status changes are serialized by UPDATE's row lock. Terminal invoices cannot
-- be reopened; approved funds cannot be released by reject while a transfer is uncertain.
create function public.guard_payout_transition() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.status is distinct from new.status then
    if not ((old.status='pending_approval' and new.status in ('requested','rejected','canceled'))
      or (old.status='requested' and new.status in ('approved','rejected','paid'))
      or (old.status='approved' and new.status='paid'))
    then raise exception 'Invalid payout transition; approved transfers require investigation before release'; end if;
    if new.status='paid' and (nullif(trim(new.payment_reference),'') is null
      or nullif(trim(new.payment_proof_key),'') is null or new.paid_at is null)
    then raise exception 'Transfer reference, proof and date required'; end if;
    insert into public.payment_financial_audit(organization_id,entity_type,entity_id,actor_id,before_state,after_state)
      values(new.organization_id,'payout',new.id::text,coalesce(new.paid_by,new.reviewed_by),
        jsonb_build_object('status',old.status),jsonb_build_object('status',new.status,'reference',new.payment_reference));
    -- Legacy full-ledger allocations are updated in the SAME DB transaction.
    update public.payment_ledger_entries set
      settlement_status=case when new.status in ('rejected','canceled') then null else new.status end,
      payout_invoice_id=case when new.status in ('rejected','canceled') then null else new.id end
      where payout_invoice_id=new.id;
    update public.transactions set
      payout_status=case when new.status in ('rejected','canceled') then null else new.status end,
      payout_invoice_id=case when new.status in ('rejected','canceled') then null else new.id end
      where payout_invoice_id=new.id;
  end if;
  return new;
end $$;
create trigger guard_payout_transition before update on public.payout_invoices
  for each row execute function public.guard_payout_transition();

-- Remove direct financial writes by tenant JWTs. Backend actions authenticate
-- role + organization and use service-role writes; read RLS remains unchanged.
revoke insert,update,delete on public.payout_invoices,public.payout_invoice_items from authenticated;
notify pgrst,'reload schema';
commit;
