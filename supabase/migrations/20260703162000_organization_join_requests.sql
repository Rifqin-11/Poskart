-- Migration: Add organization_join_requests and update join_organization_by_code function
-- Creates join requests table and updates RPC to request membership instead of joining directly.

CREATE TABLE IF NOT EXISTS public.organization_join_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.organization_join_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.organization_join_requests;
DROP POLICY IF EXISTS "Users can insert their own join requests" ON public.organization_join_requests;
DROP POLICY IF EXISTS "Organization managers can manage join requests" ON public.organization_join_requests;

-- RLS Policies
CREATE POLICY "Users can view their own join requests"
  ON public.organization_join_requests FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR organization_id IN (SELECT ids.organization_id FROM public.auth_manageable_organization_ids() as ids)
  );

CREATE POLICY "Users can insert their own join requests"
  ON public.organization_join_requests FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
  );

CREATE POLICY "Organization managers can manage join requests"
  ON public.organization_join_requests FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT ids.organization_id FROM public.auth_manageable_organization_ids() as ids)
  );

-- Revoke and grant privileges
REVOKE ALL ON public.organization_join_requests FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_join_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_join_requests TO service_role;

-- Redefine public.join_organization_by_code
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

  -- Create join request instead of immediate membership
  INSERT INTO public.organization_join_requests (organization_id, profile_id, status)
  VALUES (target_org.id, current_user_id, 'pending')
  ON CONFLICT (organization_id, profile_id) DO UPDATE
  SET status = 'pending', updated_at = now();

  -- Insert notification for the organization
  INSERT INTO public.admin_notifications (audience, organization_id, type, title, body, href, metadata)
  VALUES (
    'organization',
    target_org.id,
    'join_request',
    'Permintaan Bergabung Baru',
    coalesce(current_user_email, 'Seorang pengguna') || ' ingin bergabung dengan workspace Anda.',
    '/settings?tab=organization',
    jsonb_build_object(
      'profile_id', current_user_id,
      'email', coalesce(current_user_email, '')
    )
  );

  RETURN QUERY SELECT target_org.id::text, target_org.name::text;
END;
$$;
