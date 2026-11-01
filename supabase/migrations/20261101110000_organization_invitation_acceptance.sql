-- Organization invitations are now explicit, expiring, and single-use.

ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.organization_invitations
SET
  status = COALESCE(status, 'pending'),
  expires_at = COALESCE(expires_at, created_at + interval '7 days'),
  updated_at = COALESCE(updated_at, created_at)
WHERE status IS NULL OR expires_at IS NULL OR updated_at IS NULL;

-- Legacy rows were created without a secure token. They cannot be accepted by
-- the new flow, so do not leave them looking like active invitations.
UPDATE public.organization_invitations
SET status = 'revoked', updated_at = now()
WHERE token_hash IS NULL AND status = 'pending';

ALTER TABLE public.organization_invitations
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days'),
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_invitations_status_check'
  ) THEN
    ALTER TABLE public.organization_invitations
      ADD CONSTRAINT organization_invitations_status_check
      CHECK (status IN ('pending', 'accepted', 'declined', 'revoked'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_token_hash_key
  ON public.organization_invitations (token_hash)
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS organization_invitations_email_status_idx
  ON public.organization_invitations (lower(email), status);

-- Accepting an invitation is deliberately atomic. The caller must be
-- authenticated, and the email on the auth account must match the invite.
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(
  invitation_token_hash text,
  leave_current boolean DEFAULT false
)
RETURNS TABLE (organization_id text, organization_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_user_email text;
  invitation_row record;
  has_other_memberships boolean;
  has_owner_membership boolean;
  target_member_exists boolean;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;

  SELECT
    invitation.id,
    invitation.email,
    invitation.organization_id,
    organization.name AS organization_name
  INTO invitation_row
  FROM public.organization_invitations AS invitation
  JOIN public.organizations AS organization
    ON organization.id = invitation.organization_id
  WHERE invitation.token_hash = invitation_token_hash
    AND invitation.status = 'pending'
    AND invitation.expires_at > now()
  FOR UPDATE OF invitation;

  IF invitation_row.id IS NULL THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
  END IF;

  IF lower(coalesce(current_user_email, '')) <> lower(invitation_row.email) THEN
    RAISE EXCEPTION 'This invitation belongs to a different email address';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE profile_id = current_user_id
      AND organization_id <> invitation_row.organization_id
  ) INTO has_other_memberships;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE profile_id = current_user_id
      AND organization_id <> invitation_row.organization_id
      AND role = 'owner'
  ) INTO has_owner_membership;

  IF has_other_memberships AND NOT leave_current THEN
    RAISE EXCEPTION 'INVITATION_MEMBERSHIP_CONFLICT';
  END IF;

  IF has_owner_membership AND leave_current THEN
    RAISE EXCEPTION 'Transfer ownership or delete your current workspace before joining another one';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE profile_id = current_user_id
      AND organization_id = invitation_row.organization_id
  ) INTO target_member_exists;

  IF leave_current THEN
    DELETE FROM public.organization_members
    WHERE profile_id = current_user_id
      AND organization_id <> invitation_row.organization_id;
  END IF;

  IF NOT target_member_exists THEN
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (invitation_row.organization_id, current_user_id, 'staff');
  END IF;

  UPDATE public.organization_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by = current_user_id,
    updated_at = now()
  WHERE id = invitation_row.id;

  RETURN QUERY SELECT
    invitation_row.organization_id::text,
    invitation_row.organization_name::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_organization_invitation(
  invitation_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_user_email text;
  invitation_row record;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;

  SELECT id, email INTO invitation_row
  FROM public.organization_invitations
  WHERE token_hash = invitation_token_hash
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF invitation_row.id IS NULL THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
  END IF;

  IF lower(coalesce(current_user_email, '')) <> lower(invitation_row.email) THEN
    RAISE EXCEPTION 'This invitation belongs to a different email address';
  END IF;

  UPDATE public.organization_invitations
  SET
    status = 'declined',
    declined_at = now(),
    declined_by = current_user_id,
    updated_at = now()
  WHERE id = invitation_row.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.decline_organization_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_organization_invitation(text) TO authenticated;
