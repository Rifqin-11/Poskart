-- Fix review_trial_request and activate_approved_trial: remove auth.uid() role checks
-- because these RPCs are called from server actions using the service role key,
-- which means auth.uid() returns NULL inside the RPC. Role enforcement is handled
-- server-side by requireSuperAdmin() before the RPC is called.

CREATE OR REPLACE FUNCTION review_trial_request(
  p_request_id     uuid,
  p_decision       text,
  p_note           text DEFAULT NULL,
  p_rejection_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_request trial_requests%ROWTYPE;
BEGIN
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
    status              = p_decision,
    reviewed_at         = now(),
    review_note         = p_note,
    rejection_code      = CASE WHEN p_decision = 'rejected' THEN p_rejection_code ELSE NULL END,
    rejection_reason    = CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
    approved_at         = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END,
    activation_deadline = CASE WHEN p_decision = 'approved' THEN now() + interval '72 hours' ELSE NULL END
  WHERE id = p_request_id;
END;
$$;
