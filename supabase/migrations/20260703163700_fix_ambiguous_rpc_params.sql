-- Migration: Fix ambiguous RPC return parameters in join_organization_by_code

DROP FUNCTION IF EXISTS public.join_organization_by_code(text);

CREATE OR REPLACE FUNCTION public.join_organization_by_code(org_join_code text)
RETURNS TABLE (joined_organization_id text, joined_organization_name text)
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
