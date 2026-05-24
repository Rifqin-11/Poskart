-- Migration: Add multi-tenancy and organization sharing support

-- Alter tables to add tenant_id column first (prevents function validation errors)
alter table public.profiles add column if not exists tenant_id text references public.tenants(id) on delete set null;
alter table public.booths add column if not exists tenant_id text references public.tenants(id) on delete set null;
alter table public.templates add column if not exists tenant_id text references public.tenants(id) on delete set null;
alter table public.transactions add column if not exists tenant_id text references public.tenants(id) on delete set null;
alter table public.assets add column if not exists tenant_id text references public.tenants(id) on delete set null;
alter table public.layout_schemas add column if not exists tenant_id text references public.tenants(id) on delete set null;
alter table public.theme_presets add column if not exists tenant_id text references public.tenants(id) on delete set null;

-- Helper functions for RLS and defaults
create or replace function public.get_auth_tenant_id()
returns text as $$
  select tenant_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.is_auth_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Set defaults for automatic client-side insert mapping
alter table public.booths alter column tenant_id set default public.get_auth_tenant_id();
alter table public.templates alter column tenant_id set default public.get_auth_tenant_id();
alter table public.transactions alter column tenant_id set default public.get_auth_tenant_id();
alter table public.assets alter column tenant_id set default public.get_auth_tenant_id();
alter table public.layout_schemas alter column tenant_id set default public.get_auth_tenant_id();
alter table public.theme_presets alter column tenant_id set default public.get_auth_tenant_id();

-- Create invitations table
create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tenant_id text not null references public.tenants(id) on delete cascade,
  invited_by text not null,
  created_at timestamptz not null default now(),
  unique(email, tenant_id)
);

-- Enable RLS for invitations
alter table public.tenant_invitations enable row level security;

-- Drop trigger first to recreate it
drop trigger if exists on_auth_user_created on auth.users;

-- Recreate trigger handle_new_user to support invitations
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invited_tenant_id text;
  new_tenant_id text;
begin
  -- Check if this email was invited to a tenant
  select tenant_id into invited_tenant_id
  from public.tenant_invitations
  where lower(email) = lower(new.email)
  limit 1;

  if invited_tenant_id is not null then
    -- Insert profile pointing to the invited tenant
    insert into public.profiles (id, email, role, plan_id, subscription_status, tenant_id)
    values (
      new.id,
      new.email,
      'user',
      'free',
      'free',
      invited_tenant_id
    );
    
    -- Delete the invitation since user is registered
    delete from public.tenant_invitations where lower(email) = lower(new.email);
  else
    -- Generate a unique tenant ID
    new_tenant_id := 'tnt_' || replace(gen_random_uuid()::text, '-', '');
    
    -- Create default tenant
    insert into public.tenants (id, name, plan, status, booths, users, renewal_date)
    values (
      new_tenant_id,
      'Personal Org - ' || split_part(new.email, '@', 1),
      'Free',
      'active',
      0,
      1,
      (current_date + interval '365 days')::date
    );

    -- Insert profile pointing to new tenant
    insert into public.profiles (id, email, role, plan_id, subscription_status, tenant_id)
    values (
      new.id,
      new.email,
      case when new.email in ('rifqinaufal9009@gmail.com', 'admin@poskart.id', 'admin@poskart.my.id') then 'admin' else 'user' end,
      'free',
      'free',
      new_tenant_id
    );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Bind trigger back
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Initialize existing records to a default tenant
do $$
declare
  p record;
  new_tenant_id text;
  admin_tenant_id text;
begin
  -- Check if admin tenant exists or create it
  select tenant_id into admin_tenant_id from public.profiles where email = 'rifqinaufal9009@gmail.com' limit 1;
  if admin_tenant_id is null then
    admin_tenant_id := 'tnt_admin';
    insert into public.tenants (id, name, plan, status, booths, users, renewal_date)
    values (admin_tenant_id, 'POSKART Admin Org', '1 Year', 'active', 4, 3, '2027-12-31')
    on conflict (id) do nothing;
  end if;

  -- Create a default tenant for any profile that doesn't have one
  for p in select id, email from public.profiles where tenant_id is null loop
    if p.email in ('rifqinaufal9009@gmail.com', 'admin@poskart.id', 'admin@poskart.my.id') then
      update public.profiles set tenant_id = admin_tenant_id where id = p.id;
    else
      new_tenant_id := 'tnt_' || replace(gen_random_uuid()::text, '-', '');
      
      insert into public.tenants (id, name, plan, status, booths, users, renewal_date)
      values (
        new_tenant_id,
        'Personal Org - ' || split_part(p.email, '@', 1),
        'Free',
        'active',
        0,
        1,
        '2027-12-31'
      );
      
      update public.profiles set tenant_id = new_tenant_id where id = p.id;
    end if;
  end loop;

  -- Assign any unassigned booths, templates, transactions, assets, layout_schemas, theme_presets to the admin tenant as fallback
  update public.booths set tenant_id = admin_tenant_id where tenant_id is null;
  update public.templates set tenant_id = admin_tenant_id where tenant_id is null;
  update public.transactions set tenant_id = admin_tenant_id where tenant_id is null;
  update public.assets set tenant_id = admin_tenant_id where tenant_id is null;
  update public.layout_schemas set tenant_id = admin_tenant_id where tenant_id is null;
  update public.theme_presets set tenant_id = admin_tenant_id where tenant_id is null;
end;
$$;

-- Drop all old permissive policies
drop policy if exists "Authenticated users can manage kpi_metrics" on public.kpi_metrics;
drop policy if exists "Authenticated users can manage chart_points" on public.chart_points;
drop policy if exists "Authenticated users can manage transactions" on public.transactions;
drop policy if exists "Authenticated users can manage booths" on public.booths;
drop policy if exists "Authenticated users can manage templates" on public.templates;
drop policy if exists "Authenticated users can manage pricing_products" on public.pricing_products;
drop policy if exists "Authenticated users can manage tenants" on public.tenants;
drop policy if exists "Authenticated users can manage theme_presets" on public.theme_presets;
drop policy if exists "Authenticated users can manage assets" on public.assets;
drop policy if exists "Authenticated users can manage layout_schemas" on public.layout_schemas;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Super admins can manage all profiles" on public.profiles;

-- Create fresh multi-tenant isolation policies
create policy "KPI metrics read" on public.kpi_metrics for select to authenticated using (true);
create policy "KPI metrics modify" on public.kpi_metrics for all to authenticated using (public.is_auth_admin()) with check (public.is_auth_admin());

create policy "Chart points read" on public.chart_points for select to authenticated using (true);
create policy "Chart points modify" on public.chart_points for all to authenticated using (public.is_auth_admin()) with check (public.is_auth_admin());

create policy "Pricing products read" on public.pricing_products for select to authenticated using (true);
create policy "Pricing products modify" on public.pricing_products for all to authenticated using (public.is_auth_admin()) with check (public.is_auth_admin());

-- Profile RLS: users in same tenant can read each other, only admins can manage all
create policy "View profiles in same tenant" on public.profiles for select to authenticated using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());
create policy "Manage profiles" on public.profiles for all to authenticated using (public.is_auth_admin() or id = auth.uid()) with check (public.is_auth_admin() or id = auth.uid());

-- Tenant RLS: users can see/update their own tenant, admins see all
create policy "View tenants" on public.tenants for select to authenticated using (public.is_auth_admin() or id = public.get_auth_tenant_id());
create policy "Manage tenants" on public.tenants for all to authenticated using (public.is_auth_admin() or id = public.get_auth_tenant_id()) with check (public.is_auth_admin() or id = public.get_auth_tenant_id());

-- Isolated tables policies: filter by tenant_id
create policy "Manage booths" on public.booths for all to authenticated 
  using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id()) 
  with check (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());

create policy "Manage templates" on public.templates for all to authenticated 
  using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id()) 
  with check (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());

create policy "Manage transactions" on public.transactions for all to authenticated 
  using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id()) 
  with check (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());

create policy "Manage assets" on public.assets for all to authenticated 
  using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id()) 
  with check (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());

create policy "Manage layout_schemas" on public.layout_schemas for all to authenticated 
  using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id()) 
  with check (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());

create policy "Manage theme_presets" on public.theme_presets for all to authenticated 
  using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id()) 
  with check (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());

-- Invitation policies
create policy "Manage invitations" on public.tenant_invitations for all to authenticated
  using (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id())
  with check (public.is_auth_admin() or tenant_id = public.get_auth_tenant_id());

-- Grant permissions for new invitations table
grant select, insert, update, delete on public.tenant_invitations to authenticated;
grant select on public.tenant_invitations to anon;
