-- Migration: SaaS Organizations, Subscriptions, and Organization Members

-- 0. Drop old RLS policies that depend on tenant_id
DROP POLICY IF EXISTS "View profiles in same tenant" ON public.profiles;
DROP POLICY IF EXISTS "Manage booths" ON public.booths;
DROP POLICY IF EXISTS "Manage templates" ON public.templates;
DROP POLICY IF EXISTS "Manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Manage assets" ON public.assets;
DROP POLICY IF EXISTS "Manage layout_schemas" ON public.layout_schemas;
DROP POLICY IF EXISTS "Manage theme_presets" ON public.theme_presets;
DROP POLICY IF EXISTS "Manage invitations" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "View tenants" ON public.tenants;

-- 1. Rename core tables
ALTER TABLE public.tenants RENAME TO organizations;
ALTER TABLE public.booths RENAME TO devices;
ALTER TABLE public.tenant_invitations RENAME TO organization_invitations;

-- 2. Rename columns
ALTER TABLE public.profiles RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.templates RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.assets RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.transactions RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.layout_schemas RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.theme_presets RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.devices RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE public.organization_invitations RENAME COLUMN tenant_id TO organization_id;

-- 3. Create Subscription Plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text primary key,
  name text not null,
  max_devices integer not null,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default plans
INSERT INTO public.subscription_plans (id, name, max_devices) VALUES
('free', 'Free Account', 1),
('starter', 'Starter Plan', 1),
('monthly', 'Pro Plan - Monthly', 3),
('quarterly', 'Pro Plan - 3 Months', 3),
('yearly', 'Pro Plan - Yearly', 3),
('growth', 'Growth Team', 5),
('enterprise', 'Enterprise', 10)
ON CONFLICT (id) DO UPDATE SET max_devices = EXCLUDED.max_devices;

-- 4. Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status text not null check (status in ('active', 'past_due', 'canceled', 'trialing', 'free')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id)
);

-- 5. Create Organization Members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff', 'designer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, profile_id)
);

-- 6. Port existing data
-- A. Move profiles -> organization_members
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT id, organization_id, role FROM public.profiles WHERE organization_id IS NOT NULL LOOP
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (
      p.organization_id,
      p.id,
      CASE WHEN p.role = 'admin' THEN 'owner' ELSE 'staff' END
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- B. Move organization subscription data to subscriptions table
DO $$
DECLARE
  o record;
BEGIN
  FOR o IN SELECT id, plan_id, subscription_status, subscription_expires_at FROM public.organizations LOOP
    INSERT INTO public.subscriptions (organization_id, plan_id, status, current_period_end)
    VALUES (
      o.id,
      COALESCE(o.plan_id, 'free'),
      COALESCE(o.subscription_status, 'free'),
      o.subscription_expires_at
    ) ON CONFLICT (organization_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end;
  END LOOP;
END;
$$;

-- 7. Add hardware_id to devices
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS hardware_id text;
-- Populate fake hardware_ids for existing devices
UPDATE public.devices SET hardware_id = 'hw_' || replace(gen_random_uuid()::text, '-', '') WHERE hardware_id IS NULL;
ALTER TABLE public.devices ADD CONSTRAINT devices_hardware_id_key UNIQUE (hardware_id);

-- 8. Helper Functions
CREATE OR REPLACE FUNCTION public.get_auth_organization_id()
RETURNS text AS $$
  -- Returns the first organization the user belongs to (useful for default inserts)
  SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_auth_admin()
RETURNS boolean AS $$
  -- Checks if user is owner/admin in ANY organization (global super admin for now, or per org)
  -- For true SaaS, super admins should be distinct. Let's keep a profiles.role for platform super-admin
  SELECT exists (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 9. Update default values on tables
ALTER TABLE public.devices ALTER COLUMN organization_id SET DEFAULT public.get_auth_organization_id();
ALTER TABLE public.templates ALTER COLUMN organization_id SET DEFAULT public.get_auth_organization_id();
ALTER TABLE public.transactions ALTER COLUMN organization_id SET DEFAULT public.get_auth_organization_id();
ALTER TABLE public.assets ALTER COLUMN organization_id SET DEFAULT public.get_auth_organization_id();
ALTER TABLE public.layout_schemas ALTER COLUMN organization_id SET DEFAULT public.get_auth_organization_id();
ALTER TABLE public.theme_presets ALTER COLUMN organization_id SET DEFAULT public.get_auth_organization_id();

-- 10. Update the trigger check for device limit
CREATE OR REPLACE FUNCTION public.check_device_limit()
RETURNS trigger AS $$
DECLARE
  current_device_count integer;
  allowed_limit integer;
BEGIN
  -- Get allowed limit from the active subscription
  SELECT p.max_devices INTO allowed_limit
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.organization_id = new.organization_id;
  
  IF allowed_limit IS NULL THEN
    allowed_limit := 1;
  END IF;
  
  -- Get current count
  SELECT count(*) INTO current_device_count
  FROM public.devices
  WHERE organization_id = new.organization_id;
  
  IF current_device_count >= allowed_limit THEN
    RAISE EXCEPTION 'Device limit exceeded! Your organization is limited to % device(s). Please upgrade your subscription plan.', allowed_limit;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_booth_device_limit ON public.devices;
CREATE TRIGGER enforce_device_limit
  BEFORE INSERT ON public.devices
  FOR EACH ROW EXECUTE PROCEDURE public.check_device_limit();

-- 11. Cleanup old columns from organizations and profiles
ALTER TABLE public.organizations DROP COLUMN IF EXISTS plan_id;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS subscription_expires_at;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS device_limit;

-- NOTE: We keep tenant_id on profiles for backwards compatibility during transition, or drop it
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;

-- 12. Fix Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  invited_org_id text;
  new_org_id text;
  platform_role text;
BEGIN
  -- Determine platform super admin role
  IF new.email IN ('rifqinaufal9009@gmail.com', 'admin@poskart.id', 'admin@poskart.my.id') THEN
    platform_role := 'admin';
  ELSE
    platform_role := 'user';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, platform_role);

  -- Check invitations
  SELECT organization_id INTO invited_org_id
  FROM public.organization_invitations
  WHERE lower(email) = lower(new.email)
  LIMIT 1;

  IF invited_org_id IS NOT NULL THEN
    -- Join organization as staff
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (invited_org_id, new.id, 'staff');
    
    DELETE FROM public.organization_invitations WHERE lower(email) = lower(new.email);
  ELSE
    -- Create new organization
    new_org_id := 'org_' || replace(gen_random_uuid()::text, '-', '');
    
    INSERT INTO public.organizations (id, name, plan, status, booths, users, renewal_date)
    VALUES (
      new_org_id,
      'Workspace - ' || split_part(new.email, '@', 1),
      'Free',
      'active',
      0,
      1,
      (current_date + interval '365 days')::date
    );

    -- Create subscription
    INSERT INTO public.subscriptions (organization_id, plan_id, status)
    VALUES (new_org_id, 'free', 'free');

    -- Join as owner
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (new_org_id, new.id, 'owner');
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create New RLS Policies using organization_members
-- Organizations
CREATE POLICY "View organizations" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_auth_admin() OR id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

CREATE POLICY "Manage organizations" ON public.organizations FOR ALL TO authenticated
  USING (public.is_auth_admin() OR id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (public.is_auth_admin() OR id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')));

-- Organization Members
CREATE POLICY "View organization members" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

CREATE POLICY "Manage organization members" ON public.organization_members FOR ALL TO authenticated
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')));

-- Devices (formerly booths)
CREATE POLICY "Manage devices" ON public.devices FOR ALL TO authenticated 
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

-- Templates
CREATE POLICY "Manage templates" ON public.templates FOR ALL TO authenticated 
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

-- Transactions
CREATE POLICY "Manage transactions" ON public.transactions FOR ALL TO authenticated 
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

-- Assets
CREATE POLICY "Manage assets" ON public.assets FOR ALL TO authenticated 
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

-- Layout Schemas
CREATE POLICY "Manage layout_schemas" ON public.layout_schemas FOR ALL TO authenticated 
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

-- Theme Presets
CREATE POLICY "Manage theme_presets" ON public.theme_presets FOR ALL TO authenticated 
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

-- Invitations
CREATE POLICY "Manage organization_invitations" ON public.organization_invitations FOR ALL TO authenticated
  USING (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()))
  WITH CHECK (public.is_auth_admin() OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()));

