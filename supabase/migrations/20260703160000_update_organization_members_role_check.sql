-- Migration: Update organization members role check constraint and update default roles
-- Adjusts allowed roles to: owner, admin, designer, akuntan, partner.
-- Migrates existing roles ('staff', 'operator', 'akutansi') to their correct new targets.

-- 1. Drop the old role check constraint first to allow updating to new roles
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;

-- 2. Migrate legacy role values in organization_members
UPDATE public.organization_members
SET role = 'akuntan'
WHERE role = 'akutansi';

UPDATE public.organization_members
SET role = 'partner'
WHERE role NOT IN ('owner', 'admin', 'designer', 'akuntan', 'partner');

-- 3. Apply the new restricted list constraint
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'designer', 'akuntan', 'partner'));

-- 3. Update public.join_organization_by_code function to use 'partner' as default role
CREATE OR REPLACE FUNCTION public.join_organization_by_code(org_join_code text)
RETURNS TABLE (organization_id text, organization_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  normalized_code text;
  target_org RECORD;
  current_user_email text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  normalized_code := upper(replace(trim(org_join_code), ' ', ''));
  IF normalized_code = '' THEN
    RAISE EXCEPTION 'Organization code is required';
  END IF;

  SELECT id, name INTO target_org
  FROM public.organizations
  WHERE join_code = normalized_code
  LIMIT 1;

  IF target_org.id IS NULL THEN
    RAISE EXCEPTION 'Organization code is invalid';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members WHERE profile_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  SELECT email INTO current_user_email
  FROM public.profiles
  WHERE id = current_user_id;

  IF current_user_email IS NULL THEN
    SELECT email INTO current_user_email
    FROM auth.users
    WHERE id = current_user_id;

    INSERT INTO public.profiles (id, email, role)
    VALUES (current_user_id, current_user_email, 'user')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO public.organization_members (organization_id, profile_id, role)
  VALUES (target_org.id, current_user_id, 'partner');

  RETURN QUERY SELECT target_org.id::text, target_org.name::text;
END;
$$;
