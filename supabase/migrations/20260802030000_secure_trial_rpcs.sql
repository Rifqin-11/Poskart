-- P0: Revoke public execute on trial RPCs — only service_role may call these.
-- These functions are SECURITY DEFINER and must not be callable via anon/user keys.

REVOKE EXECUTE ON FUNCTION submit_trial_request(text, text, text, text, text, text, text, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION review_trial_request(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION activate_approved_trial(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION submit_trial_request(text, text, text, text, text, text, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION review_trial_request(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION activate_approved_trial(uuid, text) TO service_role;

-- P2: Fix activation_expired bug — the previous implementation raised an exception
-- inside the same transaction as the UPDATE, rolling it back. Now we update first,
-- then raise so the status change is committed.
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
    SELECT id INTO v_claim_id FROM trial_claims WHERE request_id = p_request_id LIMIT 1;
    RETURN jsonb_build_object('claim_id', v_claim_id, 'already_active', true);
  END IF;

  IF v_request.status <> 'approved' THEN
    RAISE EXCEPTION 'Request is not approved: %', v_request.status;
  END IF;

  -- Fix: update status BEFORE raising, so the change is not rolled back
  IF v_request.activation_deadline IS NOT NULL AND now() > v_request.activation_deadline THEN
    UPDATE trial_requests SET status = 'activation_expired' WHERE id = p_request_id;
    RAISE EXCEPTION 'Activation deadline has passed';
  END IF;

  SELECT id INTO v_plan_id FROM subscription_plans WHERE id = 'starter-trial' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'starter-trial plan not found';
  END IF;

  v_ends_at := now() + interval '14 days';

  INSERT INTO subscriptions (organization_id, plan_id, status, current_period_end)
  VALUES (p_organization_id, v_plan_id, 'trialing', v_ends_at)
  ON CONFLICT (organization_id) DO UPDATE SET
    plan_id            = EXCLUDED.plan_id,
    status             = 'trialing',
    current_period_end = v_ends_at;

  INSERT INTO trial_claims (request_id, organization_id, owner_profile_id, device_id, ends_at)
  VALUES (p_request_id, p_organization_id, v_request.requester_profile_id, v_request.device_id, v_ends_at)
  RETURNING id INTO v_claim_id;

  INSERT INTO trial_identifiers (identifier_type, identifier_value, claim_id)
  VALUES ('owner_profile', v_request.requester_profile_id::text, v_claim_id)
  ON CONFLICT DO NOTHING;

  IF v_request.hardware_id_hash IS NOT NULL THEN
    INSERT INTO trial_identifiers (identifier_type, identifier_value, claim_id)
    VALUES ('hardware_id', v_request.hardware_id_hash, v_claim_id)
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE trial_requests SET status = 'activated', activated_at = now() WHERE id = p_request_id;

  RETURN jsonb_build_object('claim_id', v_claim_id, 'ends_at', v_ends_at, 'already_active', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION activate_approved_trial(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_approved_trial(uuid, text) TO service_role;

-- P1: Cron — expire trialing subscriptions that have passed current_period_end
-- Also marks the corresponding trial_claims as expired
CREATE OR REPLACE FUNCTION expire_trialing_subscriptions()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Expire subscriptions
  UPDATE subscriptions
  SET status = 'free', plan_id = 'free'
  WHERE status = 'trialing'
    AND current_period_end IS NOT NULL
    AND current_period_end < now();

  -- Mark claims as expired for those orgs
  UPDATE trial_claims
  SET status = 'expired'
  WHERE status = 'active'
    AND ends_at < now();
END;
$$;

REVOKE EXECUTE ON FUNCTION expire_trialing_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_trialing_subscriptions() TO service_role;
