-- Drop the old uuid overload that conflicts with the text version

DROP FUNCTION IF EXISTS submit_trial_request(uuid, uuid, text, text, text, text, text, date);
