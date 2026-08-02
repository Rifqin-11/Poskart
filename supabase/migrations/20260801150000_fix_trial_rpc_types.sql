-- Fix submit_trial_request: organization_id and device_id should be text, not uuid

CREATE OR REPLACE FUNCTION submit_trial_request(
  p_organization_id     text,
  p_device_id           text DEFAULT NULL,
  p_hardware_id_hash    text DEFAULT NULL,
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT role INTO v_member_role
  FROM organization_members
  WHERE profile_id = v_user_id AND organization_id = p_organization_id;

  IF v_member_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the organization owner can request a trial';
  END IF;

  SELECT email INTO v_email FROM profiles WHERE id = v_user_id;

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
