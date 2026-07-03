-- 20260703170000_add_payout_internal_approval.sql

-- 1. Alter constraints for payout_invoices and transactions
alter table public.payout_invoices
  drop constraint if exists payout_invoices_status_check;

alter table public.payout_invoices
  add constraint payout_invoices_status_check
  check (status in ('pending_approval', 'requested', 'approved', 'paid', 'rejected', 'canceled'));

alter table public.transactions
  drop constraint if exists transactions_payout_status_check;

alter table public.transactions
  add constraint transactions_payout_status_check
  check (payout_status is null or payout_status in ('pending_approval', 'requested', 'approved', 'paid'));

-- 2. Create helper function for accountant role
create or replace function public.auth_accountant_organization_ids()
returns table (organization_id text)
language sql
security definer
stable
set search_path = public
as $$
  select om.organization_id
  from public.organization_members as om
  where om.profile_id = (select auth.uid())
    and om.role = 'akuntan';
$$;

revoke execute on function public.auth_accountant_organization_ids() from public, anon;
grant execute on function public.auth_accountant_organization_ids() to authenticated, service_role;

-- 3. Add RLS policies for Accountants

-- Payout Invoices
drop policy if exists "Accountants can draft payout invoices" on public.payout_invoices;
create policy "Accountants can draft payout invoices"
  on public.payout_invoices for insert to authenticated
  with check (
    organization_id in (select ids.organization_id from public.auth_accountant_organization_ids() as ids)
    and status = 'pending_approval'
  );

drop policy if exists "Accountants can cancel their draft payout invoices" on public.payout_invoices;
create policy "Accountants can cancel their draft payout invoices"
  on public.payout_invoices for update to authenticated
  using (
    organization_id in (select ids.organization_id from public.auth_accountant_organization_ids() as ids)
    and status = 'pending_approval'
  )
  with check (
    organization_id in (select ids.organization_id from public.auth_accountant_organization_ids() as ids)
  );

-- Payout Invoice Items
drop policy if exists "Accountants can create payout invoice items" on public.payout_invoice_items;
create policy "Accountants can create payout invoice items"
  on public.payout_invoice_items for insert to authenticated
  with check (
    organization_id in (select ids.organization_id from public.auth_accountant_organization_ids() as ids)
  );

-- Inform PostgREST to reload schema
notify pgrst, 'reload schema';
