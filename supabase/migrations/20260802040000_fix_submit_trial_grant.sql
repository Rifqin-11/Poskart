-- submit_trial_request uses auth.uid() internally and enforces owner-only access
-- inside the function body. It must be callable by authenticated users, not just
-- service_role. review_ and activate_ remain service_role-only.
GRANT EXECUTE ON FUNCTION submit_trial_request(text, text, text, text, text, text, text, date) TO authenticated;
