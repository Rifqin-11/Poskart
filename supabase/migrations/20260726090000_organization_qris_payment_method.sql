-- QRIS methods are selected per organization so a kiosk can move from one
-- Duitku QRIS channel to another without changing an APK or shared env var.
alter table public.organizations
  add column if not exists qris_payment_method text not null default 'SQ';

update public.organizations as organization
set qris_payment_method = gateway.payment_method
from public.organization_payment_gateways as gateway
where gateway.organization_id = organization.id
  and gateway.provider = 'duitku'
  and gateway.payment_method in ('SQ', 'SP');

alter table public.organizations
  drop constraint if exists organizations_qris_payment_method_check;

alter table public.organizations
  add constraint organizations_qris_payment_method_check
  check (qris_payment_method in ('SQ', 'SP'));

notify pgrst, 'reload schema';
