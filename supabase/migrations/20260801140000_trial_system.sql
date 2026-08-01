-- Trial system migration
-- Adds trial_requests, trial_claims, trial_identifiers, trial_overrides tables
-- and RPCs for submit, review, and activate

-- ─── Internal trial plan ────────────────────────────────────────────────────

INSERT INTO subscription_plans (id, name, max_devices)
VALUES ('starter-trial', 'Starter Trial', 1)
ON CONFLICT (id) DO NOTHING;

-- ─── trial_requests ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trial_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       text NOT NULL REFERENCES organizations(id) ON DELETE SET NULL,
  requester_profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  device_id             text REFERENCES devices(id) ON DELETE SET NULL,
  hardware_id_hash      text,
  email_snapshot        text NOT NULL,
  contact_phone         text,
  business_name         text,
  city                  text,
  intended_use          text,
  event_date            date,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending','needs_information','approved',
                            'activated','rejected','canceled','activation_expired'
                          )),
  risk_flags            jsonb NOT NULL DEFAULT '[]',
  reviewed_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at           timestamptz,
  review_note           text,
  rejection_code        text,
  rejection_reason      text,
  approved_at           timestamptz,
  activation_deadline   timestamptz,
  activated_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Only one non-terminal request per org at a time
CREATE UNIQUE INDEX IF NOT EXISTS trial_requests_org_active_uniq
  ON trial_requests (organization_id)
  WHERE status IN ('pending', 'needs_information', 'approved');

CREATE INDEX IF NOT EXISTS trial_requests_status_idx ON trial_requests (status);
CREATE INDEX IF NOT EXISTS trial_requests_org_idx ON trial_requests (organization_id);
CREATE INDEX IF NOT EXISTS trial_requests_created_idx ON trial_requests (created_at DESC);

-- ─── trial_claims ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trial_claims (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          uuid NOT NULL REFERENCES trial_requests(id) ON DELETE RESTRICT,
  organization_id     text NOT NULL REFERENCES organizations(id) ON DELETE SET NULL,
  owner_profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  device_id           text REFERENCES devices(id) ON DELETE SET NULL,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ends_at             timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','converted','expired','revoked')),
  converted_at        timestamptz,
  revoked_at          timestamptz,
  revoked_by          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  revoke_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trial_claims_org_idx ON trial_claims (organization_id);
CREATE INDEX IF NOT EXISTS trial_claims_owner_idx ON trial_claims (owner_profile_id);
CREATE INDEX IF NOT EXISTS trial_claims_status_idx ON trial_claims (status);

-- ─── trial_identifiers ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trial_identifiers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type   text NOT NULL CHECK (identifier_type IN ('owner_profile','hardware_id','payout_account')),
  identifier_value  text NOT NULL,
  claim_id          uuid REFERENCES trial_claims(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS trial_identifiers_type_val_idx
  ON trial_identifiers (identifier_type, identifier_value);

-- ─── trial_overrides ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trial_overrides (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        uuid NOT NULL REFERENCES trial_requests(id) ON DELETE CASCADE,
  identifier_type   text NOT NULL CHECK (identifier_type IN ('owner_profile','hardware_id','payout_account')),
  identifier_value  text NOT NULL,
  reason            text NOT NULL,
  granted_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trial_requests_updated_at ON trial_requests;
CREATE TRIGGER trial_requests_updated_at
  BEFORE UPDATE ON trial_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RPC: submit_trial_request ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION submit_trial_request(
  p_organization_id     uuid,
  p_device_id           uuid,
  p_hardware_id_hash    text,
  p_contact_phone       text DEFAULT NULL,
  p_business_name       text DEFAULT NULL,
  p_city                text DEFAULT NULL,
  p_intended_use        text DEFAULT NULL,
  p_event_date          date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id         uuid := auth.uid();
  v_email           text;
  v_risk_flags      jsonb := '[]';
  v_auto_reject     boolean := false;
  v_reject_reason   text;
  v_request_id      uuid;
  v_member_role     text;
BEGIN
  -- Caller must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Caller must be owner of the org
  SELECT role INTO v_member_role
  FROM organization_members
  WHERE profile_id = v_user_id AND organization_id = p_organization_id;

  IF v_member_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the organization owner can request a trial';
  END IF;

  SELECT email INTO v_email FROM profiles WHERE id = v_user_id;

  -- Check duplicate owner (profile already used a trial)
  IF EXISTS (
    SELECT 1 FROM trial_identifiers
    WHERE identifier_type = 'owner_profile' AND identifier_value = v_user_id::text
    AND NOT EXISTS (
      SELECT 1 FROM trial_overrides o
      JOIN trial_requests r ON r.id = o.request_id
      WHERE o.identifier_type = 'owner_profile'
        AND o.identifier_value = v_user_id::text
        AND r.organization_id = p_organization_id
    )
  ) THEN
    v_auto_reject := true;
    v_reject_reason := 'duplicate_owner';
    v_risk_flags := v_risk_flags || '["duplicate_owner"]';
  END IF;

  -- Check duplicate hardware
  IF p_hardware_id_hash IS NOT NULL AND EXISTS (
    SELECT 1 FROM trial_identifiers
    WHERE identifier_type = 'hardware_id' AND identifier_value = p_hardware_id_hash
    AND NOT EXISTS (
      SELECT 1 FROM trial_overrides o
      JOIN trial_requests r ON r.id = o.request_id
      WHERE o.identifier_type = 'hardware_id'
        AND o.identifier_value = p_hardware_id_hash
        AND r.organization_id = p_organization_id
    )
  ) THEN
    v_auto_reject := true;
    v_reject_reason := COALESCE(v_reject_reason, 'duplicate_hardware');
    v_risk_flags := v_risk_flags || '["duplicate_hardware"]';
  END IF;

  INSERT INTO trial_requests (
    organization_id, requester_profile_id, device_id, hardware_id_hash,
    email_snapshot, contact_phone, business_name, city, intended_use, event_date,
    status, risk_flags,
    rejection_code, rejection_reason,
    reviewed_at
  ) VALUES (
    p_organization_id, v_user_id, p_device_id, p_hardware_id_hash,
    v_email, p_contact_phone, p_business_name, p_city, p_intended_use, p_event_date,
    CASE WHEN v_auto_reject THEN 'rejected' ELSE 'pending' END,
    v_risk_flags,
    CASE WHEN v_auto_reject THEN v_reject_reason ELSE NULL END,
    CASE WHEN v_auto_reject THEN 'Otomatis ditolak: ' || v_reject_reason ELSE NULL END,
    CASE WHEN v_auto_reject THEN now() ELSE NULL END
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'auto_rejected', v_auto_reject,
    'rejection_code', v_reject_reason
  );
END;
$$;

-- ─── RPC: review_trial_request ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION review_trial_request(
  p_request_id  uuid,
  p_decision    text,   -- 'approved' | 'rejected' | 'needs_information'
  p_note        text DEFAULT NULL,
  p_rejection_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reviewer_id   uuid := auth.uid();
  v_reviewer_role text;
  v_request       trial_requests%ROWTYPE;
BEGIN
  SELECT role INTO v_reviewer_role FROM profiles WHERE id = v_reviewer_id;
  IF v_reviewer_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only superadmin can review trial requests';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected', 'needs_information') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  SELECT * INTO v_request FROM trial_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trial request not found';
  END IF;

  IF v_request.status NOT IN ('pending', 'needs_information') THEN
    RAISE EXCEPTION 'Request is not in a reviewable state: %', v_request.status;
  END IF;

  UPDATE trial_requests SET
    status            = p_decision,
    reviewed_by       = v_reviewer_id,
    reviewed_at       = now(),
    review_note       = p_note,
    rejection_code    = CASE WHEN p_decision = 'rejected' THEN p_rejection_code ELSE NULL END,
    rejection_reason  = CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
    approved_at       = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END,
    -- 72h window for the device to activate
    activation_deadline = CASE WHEN p_decision = 'approved' THEN now() + interval '72 hours' ELSE NULL END
  WHERE id = p_request_id;
END;
$$;

-- ─── RPC: activate_approved_trial ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION activate_approved_trial(
  p_request_id        uuid,
  p_organization_id   text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_request         trial_requests%ROWTYPE;
  v_plan_id         text;
  v_ends_at         timestamptz;
  v_claim_id        uuid;
BEGIN
  SELECT * INTO v_request FROM trial_requests
  WHERE id = p_request_id AND organization_id = p_organization_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trial request not found';
  END IF;

  IF v_request.status = 'activated' THEN
    -- Idempotent: return existing claim
    SELECT id INTO v_claim_id FROM trial_claims WHERE request_id = p_request_id LIMIT 1;
    RETURN jsonb_build_object('claim_id', v_claim_id, 'already_active', true);
  END IF;

  IF v_request.status <> 'approved' THEN
    RAISE EXCEPTION 'Request is not approved: %', v_request.status;
  END IF;

  IF v_request.activation_deadline IS NOT NULL AND now() > v_request.activation_deadline THEN
    UPDATE trial_requests SET status = 'activation_expired' WHERE id = p_request_id;
    RAISE EXCEPTION 'Activation deadline has passed';
  END IF;

  SELECT id INTO v_plan_id FROM subscription_plans WHERE id = 'starter-trial' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'starter-trial plan not found';
  END IF;

  v_ends_at := now() + interval '14 days';

  -- Upsert subscription to trialing
  INSERT INTO subscriptions (
    organization_id, plan_id, status, current_period_end
  ) VALUES (
    p_organization_id, v_plan_id, 'trialing', v_ends_at
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    plan_id            = EXCLUDED.plan_id,
    status             = 'trialing',
    current_period_end = v_ends_at;

  -- Create claim
  INSERT INTO trial_claims (
    request_id, organization_id, owner_profile_id, device_id, ends_at
  ) VALUES (
    p_request_id, p_organization_id, v_request.requester_profile_id,
    v_request.device_id, v_ends_at
  )
  RETURNING id INTO v_claim_id;

  -- Record identifiers for duplicate detection
  INSERT INTO trial_identifiers (identifier_type, identifier_value, claim_id)
  VALUES ('owner_profile', v_request.requester_profile_id::text, v_claim_id)
  ON CONFLICT DO NOTHING;

  IF v_request.hardware_id_hash IS NOT NULL THEN
    INSERT INTO trial_identifiers (identifier_type, identifier_value, claim_id)
    VALUES ('hardware_id', v_request.hardware_id_hash, v_claim_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Mark request as activated
  UPDATE trial_requests SET
    status       = 'activated',
    activated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('claim_id', v_claim_id, 'ends_at', v_ends_at, 'already_active', false);
END;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE trial_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_overrides ENABLE ROW LEVEL SECURITY;

-- Superadmin can do everything
CREATE POLICY trial_requests_superadmin ON trial_requests
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY trial_claims_superadmin ON trial_claims
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY trial_identifiers_superadmin ON trial_identifiers
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY trial_overrides_superadmin ON trial_overrides
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Org owner can read their own requests
CREATE POLICY trial_requests_owner_read ON trial_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = trial_requests.organization_id
        AND profile_id = auth.uid()
        AND role = 'owner'
    )
  );

CREATE POLICY trial_claims_owner_read ON trial_claims
  FOR SELECT
  USING (owner_profile_id = auth.uid());
