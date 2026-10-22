-- Self-service trials: one lifetime activation per organization, email and owner.
-- Identifiers intentionally survive account/organization deletion and revocation.
BEGIN;

ALTER TABLE public.trial_requests
  ALTER COLUMN organization_id DROP NOT NULL,
  ALTER COLUMN requester_profile_id DROP NOT NULL;
ALTER TABLE public.trial_claims
  ALTER COLUMN organization_id DROP NOT NULL,
  ALTER COLUMN owner_profile_id DROP NOT NULL;
ALTER TABLE public.trial_overrides ALTER COLUMN granted_by DROP NOT NULL;

ALTER TABLE public.trial_identifiers
  DROP CONSTRAINT trial_identifiers_identifier_type_check;
ALTER TABLE public.trial_identifiers
  ADD CONSTRAINT trial_identifiers_identifier_type_check
  CHECK (identifier_type IN ('organization', 'email', 'owner_profile', 'hardware_id', 'payout_account'));

-- Include expired, converted and revoked trials, not merely currently active ones.
INSERT INTO public.trial_identifiers (identifier_type, identifier_value, claim_id)
SELECT DISTINCT ON (r.organization_id) 'organization', r.organization_id, c.id
FROM public.trial_requests r
LEFT JOIN public.trial_claims c ON c.request_id = r.id
WHERE r.organization_id IS NOT NULL AND (c.id IS NOT NULL OR r.activated_at IS NOT NULL)
ORDER BY r.organization_id, r.created_at
ON CONFLICT (identifier_type, identifier_value) DO NOTHING;

INSERT INTO public.trial_identifiers (identifier_type, identifier_value, claim_id)
SELECT DISTINCT ON (lower(btrim(r.email_snapshot))) 'email', lower(btrim(r.email_snapshot)), c.id
FROM public.trial_requests r
LEFT JOIN public.trial_claims c ON c.request_id = r.id
WHERE btrim(r.email_snapshot) <> '' AND (c.id IS NOT NULL OR r.activated_at IS NOT NULL)
ORDER BY lower(btrim(r.email_snapshot)), r.created_at
ON CONFLICT (identifier_type, identifier_value) DO NOTHING;

INSERT INTO public.trial_identifiers (identifier_type, identifier_value, claim_id)
SELECT DISTINCT ON (r.requester_profile_id) 'owner_profile', r.requester_profile_id::text, c.id
FROM public.trial_requests r
LEFT JOIN public.trial_claims c ON c.request_id = r.id
WHERE r.requester_profile_id IS NOT NULL AND (c.id IS NOT NULL OR r.activated_at IS NOT NULL)
ORDER BY r.requester_profile_id, r.created_at
ON CONFLICT (identifier_type, identifier_value) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_trial_eligibility(p_organization_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_confirmed_at timestamptz;
  v_claim public.trial_claims%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_reason text;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND profile_id = v_user_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the organization owner can start a trial';
  END IF;

  -- Use the authenticated identity, never an editable business/profile email.
  SELECT lower(btrim(email)), email_confirmed_at INTO v_email, v_confirmed_at
  FROM auth.users WHERE id = v_user_id;
  SELECT * INTO v_claim FROM public.trial_claims
  WHERE organization_id = p_organization_id ORDER BY started_at DESC LIMIT 1;
  SELECT * INTO v_subscription FROM public.subscriptions
  WHERE organization_id = p_organization_id;

  IF EXISTS (SELECT 1 FROM public.trial_identifiers
      WHERE identifier_type = 'organization' AND identifier_value = p_organization_id)
      OR v_claim.id IS NOT NULL THEN
    v_reason := 'duplicate_organization';
  ELSIF EXISTS (SELECT 1 FROM public.trial_identifiers
      WHERE identifier_type = 'email' AND identifier_value = v_email) THEN
    v_reason := 'duplicate_email';
  ELSIF EXISTS (SELECT 1 FROM public.trial_identifiers
      WHERE identifier_type = 'owner_profile' AND identifier_value = v_user_id::text) THEN
    v_reason := 'duplicate_owner';
  ELSIF v_subscription.status IN ('active', 'trialing', 'past_due', 'canceled') THEN
    v_reason := 'subscription_exists';
  ELSIF v_email IS NULL OR v_email = '' OR v_confirmed_at IS NULL THEN
    v_reason := 'email_unverified';
  END IF;

  RETURN jsonb_build_object(
    'checked_at', now(),
    'eligible', v_reason IS NULL,
    'reason', v_reason,
    'claim_status', CASE
      WHEN v_claim.status = 'active' AND v_claim.ends_at <= now() THEN 'expired'
      WHEN v_claim.status = 'active' AND v_subscription.status = 'active' THEN 'converted'
      ELSE v_claim.status END,
    'ends_at', v_claim.ends_at,
    'revoke_reason', v_claim.revoke_reason
  );
END;
$$;

-- An early migration left a UUID-device overload with the same RPC name.
DROP FUNCTION IF EXISTS public.submit_trial_request(text, uuid, text, text, text, text, text, date);

CREATE OR REPLACE FUNCTION public.submit_trial_request(
  p_organization_id text,
  p_device_id text DEFAULT NULL,
  p_hardware_id_hash text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_intended_use text DEFAULT NULL,
  p_event_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_request_id uuid;
  v_claim_id uuid;
  v_ends_at timestamptz;
  v_eligibility jsonb;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND profile_id = v_user_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the organization owner can start a trial';
  END IF;
  SELECT lower(btrim(email)) INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Same lock used by paid-payment reconciliation, including missing subscriptions.
  -- Owner/email locks also serialize attempts across different organizations.
  PERFORM pg_advisory_xact_lock(hashtextextended('trial-owner:' || v_user_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('trial-email:' || coalesce(v_email, ''), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('subscription:' || p_organization_id, 0));
  PERFORM 1 FROM public.subscriptions WHERE organization_id = p_organization_id FOR UPDATE;

  -- Retries of a successful activation do not restart or extend the trial.
  SELECT c.id, c.request_id, c.ends_at INTO v_claim_id, v_request_id, v_ends_at
  FROM public.trial_claims c JOIN public.subscriptions s ON s.organization_id = c.organization_id
  WHERE c.organization_id = p_organization_id AND c.status = 'active'
    AND c.ends_at > now() AND s.status = 'trialing' AND s.plan_id = 'starter-trial'
  ORDER BY c.started_at DESC LIMIT 1;
  IF v_claim_id IS NOT NULL THEN
    RETURN jsonb_build_object('request_id', v_request_id, 'claim_id', v_claim_id,
      'ends_at', v_ends_at, 'auto_rejected', false, 'already_active', true, 'rejection_code', NULL);
  END IF;

  v_eligibility := public.get_trial_eligibility(p_organization_id);
  IF NOT (v_eligibility->>'eligible')::boolean THEN
    RETURN jsonb_build_object('request_id', NULL, 'auto_rejected', true,
      'already_active', false, 'rejection_code', v_eligibility->>'reason');
  END IF;

  -- A legacy pending request can be started immediately by its current owner.
  SELECT id INTO v_request_id FROM public.trial_requests
  WHERE organization_id = p_organization_id AND status IN ('pending', 'needs_information', 'approved')
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_request_id IS NULL THEN
    INSERT INTO public.trial_requests (
      organization_id, requester_profile_id, email_snapshot, hardware_id_hash,
      contact_phone, business_name, city, intended_use, event_date, status, activated_at
    ) VALUES (
      p_organization_id, v_user_id, v_email, p_hardware_id_hash,
      p_contact_phone, p_business_name, p_city, p_intended_use, p_event_date, 'activated', now()
    ) RETURNING id INTO v_request_id;
  ELSE
    UPDATE public.trial_requests SET
      requester_profile_id = v_user_id, email_snapshot = v_email,
      status = 'activated', activated_at = now(), activation_deadline = NULL,
      rejection_code = NULL, rejection_reason = NULL
    WHERE id = v_request_id;
  END IF;

  v_ends_at := now() + interval '14 days';
  INSERT INTO public.trial_claims (request_id, organization_id, owner_profile_id, ends_at)
  VALUES (v_request_id, p_organization_id, v_user_id, v_ends_at)
  RETURNING id INTO v_claim_id;

  -- No override and no ON CONFLICT DO NOTHING: lifetime uniqueness is mandatory.
  INSERT INTO public.trial_identifiers (identifier_type, identifier_value, claim_id) VALUES
    ('organization', p_organization_id, v_claim_id),
    ('email', v_email, v_claim_id),
    ('owner_profile', v_user_id::text, v_claim_id);

  INSERT INTO public.subscriptions (organization_id, plan_id, status, current_period_end, device_limit, updated_at)
  VALUES (p_organization_id, 'starter-trial', 'trialing', v_ends_at, 1, now())
  ON CONFLICT (organization_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id, status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end, device_limit = 1, updated_at = now();

  RETURN jsonb_build_object('request_id', v_request_id, 'claim_id', v_claim_id,
    'ends_at', v_ends_at, 'auto_rejected', false, 'already_active', false, 'rejection_code', NULL);
END;
$$;

-- Close the old service-role activation path; it bypassed lifetime checks.
CREATE OR REPLACE FUNCTION public.activate_approved_trial(p_request_id uuid, p_organization_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Manual trial approval is no longer supported. Use submit_trial_request.';
END;
$$;

-- Keep management status accurate when a trial organization purchases a plan.
CREATE OR REPLACE FUNCTION public.mark_trial_converted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.trial_claims SET status = 'converted', converted_at = now()
    WHERE organization_id = NEW.organization_id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER subscription_trial_converted
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.mark_trial_converted();
UPDATE public.trial_claims c SET status = 'converted', converted_at = now()
FROM public.subscriptions s
WHERE c.organization_id = s.organization_id AND c.status = 'active' AND s.status = 'active';

CREATE OR REPLACE FUNCTION public.revoke_trial(p_request_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_org_id text;
  v_claim public.trial_claims%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only superadmin can revoke a trial';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 OR length(btrim(p_reason)) > 1000 THEN
    RAISE EXCEPTION 'Alasan pembatalan harus berisi 5–1000 karakter.';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.trial_requests WHERE id = p_request_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organisasi trial tidak ditemukan.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('subscription:' || v_org_id, 0));
  SELECT * INTO v_subscription FROM public.subscriptions WHERE organization_id = v_org_id FOR UPDATE;
  SELECT * INTO v_claim FROM public.trial_claims
  WHERE request_id = p_request_id ORDER BY started_at DESC LIMIT 1 FOR UPDATE;

  IF v_claim.id IS NULL THEN RAISE EXCEPTION 'Trial tidak ditemukan.'; END IF;
  IF v_claim.status = 'revoked' THEN
    RETURN jsonb_build_object('already_revoked', true);
  END IF;
  IF v_claim.status <> 'active' OR v_claim.ends_at <= now() THEN
    RAISE EXCEPTION 'Tidak ada trial aktif untuk dibatalkan.';
  END IF;
  IF v_subscription.status IS DISTINCT FROM 'trialing'
      OR v_subscription.plan_id IS DISTINCT FROM 'starter-trial' THEN
    RAISE EXCEPTION 'Subscription bukan trial. Paket berbayar tidak boleh dibatalkan melalui aksi ini.';
  END IF;

  UPDATE public.trial_claims SET status = 'revoked', revoked_at = now(),
    revoked_by = v_admin_id, revoke_reason = btrim(p_reason) WHERE id = v_claim.id;
  UPDATE public.subscriptions SET status = 'free', plan_id = 'free',
    current_period_end = NULL, device_limit = 1, updated_at = now()
  WHERE organization_id = v_org_id AND status = 'trialing' AND plan_id = 'starter-trial';
  UPDATE public.trial_requests SET status = 'canceled', review_note = btrim(p_reason),
    reviewed_by = v_admin_id, reviewed_at = now() WHERE id = p_request_id;
  -- trial_identifiers are deliberately retained: revoked trials cannot be restarted.
  RETURN jsonb_build_object('already_revoked', false, 'organization_id', v_org_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_trial_eligibility(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_trial_request(text, text, text, text, text, text, text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_trial(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_trial_converted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_approved_trial(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.review_trial_request(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trial_eligibility(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_trial_request(text, text, text, text, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_trial(uuid, text) TO authenticated;

COMMIT;
