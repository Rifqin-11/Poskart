-- Migration: Fix ambiguous organization_id column reference in RLS policies for payout_invoices and transaction_action_requests

drop policy if exists "Users can view their organization payout invoices" on public.payout_invoices;
create policy "Users can view their organization payout invoices"
  on public.payout_invoices
  for select
  to authenticated
  using (
    public.payout_invoices.organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

drop policy if exists "Organization managers can insert payout invoices" on public.payout_invoices;
create policy "Organization managers can insert payout invoices"
  on public.payout_invoices
  for insert
  to authenticated
  with check (
    public.payout_invoices.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

drop policy if exists "Organization managers can update their payout invoices" on public.payout_invoices;
create policy "Organization managers can update their payout invoices"
  on public.payout_invoices
  for update
  to authenticated
  using (
    public.payout_invoices.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  )
  with check (
    public.payout_invoices.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

drop policy if exists "Users can view their organization transaction action requests" on public.transaction_action_requests;
create policy "Users can view their organization transaction action requests"
  on public.transaction_action_requests
  for select
  to authenticated
  using (
    public.transaction_action_requests.organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

drop policy if exists "Organization managers can insert transaction action requests" on public.transaction_action_requests;
create policy "Organization managers can insert transaction action requests"
  on public.transaction_action_requests
  for insert
  to authenticated
  with check (
    public.transaction_action_requests.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

drop policy if exists "Organization managers can update transaction action requests" on public.transaction_action_requests;
create policy "Organization managers can update transaction action requests"
  on public.transaction_action_requests
  for update
  to authenticated
  using (
    public.transaction_action_requests.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  )
  with check (
    public.transaction_action_requests.organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

notify pgrst, 'reload schema';
