-- Keep SaaS subscription plans global, while scoping photo/event pricing to
-- the organization that owns the booth configuration.

alter table public.pricing_products
  add column if not exists organization_id text;

do $$
declare
  target_organization_id text;
  foreign_organization_count integer;
begin
  select id
    into target_organization_id
  from public.organizations
  where name = 'POSKART Receipt Photobooth'
  order by created_at, id
  limit 1;

  if target_organization_id is null then
    if exists (select 1 from public.pricing_products) then
      raise exception
        'Cannot scope pricing products: organization "POSKART Receipt Photobooth" was not found';
    end if;
  else
    update public.pricing_products
    set organization_id = target_organization_id
    where organization_id is null;

    select count(*)
      into foreign_organization_count
    from public.pricing_products
    where organization_id is distinct from target_organization_id;

    if foreign_organization_count > 0 then
      raise exception
        'Cannot scope pricing products: found % product(s) assigned to another organization',
        foreign_organization_count;
    end if;
  end if;
end;
$$;

alter table public.pricing_products
  drop constraint if exists pricing_products_organization_id_fkey;

alter table public.pricing_products
  add constraint pricing_products_organization_id_fkey
  foreign key (organization_id)
  references public.organizations(id)
  on delete cascade;

alter table public.pricing_products
  alter column organization_id set default public.get_auth_organization_id(),
  alter column organization_id set not null;

create index if not exists pricing_products_organization_active_price_idx
  on public.pricing_products (organization_id, active, price);

drop policy if exists "Authenticated users can manage pricing_products"
  on public.pricing_products;
drop policy if exists "Pricing products read" on public.pricing_products;
drop policy if exists "Pricing products modify" on public.pricing_products;

create policy "Pricing products read" on public.pricing_products
  for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

create policy "Pricing products modify" on public.pricing_products
  for all to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
        and role in ('owner', 'admin', 'akuntan')
    )
  )
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
        and role in ('owner', 'admin', 'akuntan')
    )
  );

comment on column public.pricing_products.organization_id is
  'Organization owner of photo/event pricing. SaaS subscription_plans remain global.';

create or replace function public.validate_device_pricing_product_organization()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  device_organization_id text;
begin
  select organization_id into device_organization_id
  from public.devices
  where id = new.device_id;

  if device_organization_id is null
    or new.organization_id <> device_organization_id
    or not exists (
      select 1
      from public.pricing_products
      where id = new.pricing_product_id
        and organization_id = new.organization_id
    ) then
    raise exception 'Device pricing assignment is invalid for this organization';
  end if;
  return new;
end;
$$;

create or replace function public.set_device_pricing_products(
  target_device_id text,
  target_pricing_product_ids text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_organization_id text;
  matching_product_count integer;
  distinct_product_count integer;
  event_product_count integer;
begin
  select organization_id into target_organization_id
  from public.devices
  where id = target_device_id;

  if target_organization_id is null then
    raise exception 'Device % was not found or cannot be configured', target_device_id;
  end if;

  if not public.is_auth_admin() and not exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin', 'designer')
  ) then
    raise exception 'You are not allowed to configure this device';
  end if;

  select count(distinct pricing_product_id)
    into distinct_product_count
  from unnest(coalesce(target_pricing_product_ids, array[]::text[]))
    as input(pricing_product_id);

  select count(*), count(*) filter (where access_mode = 'event')
    into matching_product_count, event_product_count
  from public.pricing_products
  where active = true
    and organization_id = target_organization_id
    and id = any(coalesce(target_pricing_product_ids, array[]::text[]));

  if matching_product_count <> distinct_product_count then
    raise exception 'One or more pricing products are unavailable';
  end if;
  if event_product_count > 1 then
    raise exception 'Only one event product can be assigned to a device';
  end if;

  delete from public.device_pricing_products
  where device_id = target_device_id;

  insert into public.device_pricing_products (
    device_id,
    pricing_product_id,
    organization_id,
    display_order
  )
  select
    target_device_id,
    input.pricing_product_id,
    target_organization_id,
    min(input.ordinality)::integer - 1
  from unnest(coalesce(target_pricing_product_ids, array[]::text[]))
    with ordinality as input(pricing_product_id, ordinality)
  group by input.pricing_product_id;

  update public.devices
  set pricing_profiles = coalesce(target_pricing_product_ids, array[]::text[]),
      pricing_profile = coalesce(target_pricing_product_ids[1], ''),
      updated_at = now()
  where id = target_device_id
    and organization_id = target_organization_id;
end;
$$;

grant execute on function public.set_device_pricing_products(text, text[]) to authenticated;
