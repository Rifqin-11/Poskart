-- Migration: keep legacy organization invite_code compatible and link
-- Duitku subscription orders to the authenticated workspace.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'invite_code'
  ) then
    update public.organizations
    set invite_code = coalesce(invite_code, join_code, public.generate_organization_join_code())
    where invite_code is null;

    alter table public.organizations
      alter column invite_code drop not null;
  end if;
end $$;

alter table public.subscription_orders
  add column if not exists organization_id text references public.organizations(id) on delete set null,
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create index if not exists subscription_orders_organization_id_idx
  on public.subscription_orders (organization_id);

create index if not exists subscription_orders_profile_id_idx
  on public.subscription_orders (profile_id);
