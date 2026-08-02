-- Simple sliding-window rate limit table.
-- Each row tracks one (key, window_start) pair. Rows are pruned by the
-- check_rate_limit function so the table stays small.

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_key_window_idx
  ON rate_limits (key, window_start DESC);

-- Returns TRUE when the request is allowed, FALSE when the limit is exceeded.
-- p_key        : unique identifier, e.g. 'login:email@example.com'
-- p_window_secs: window size in seconds
-- p_max        : max requests per window
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key         text,
  p_window_secs integer,
  p_max         integer
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_window timestamptz;
  v_count  integer;
BEGIN
  v_window := date_trunc('minute', now()) - ((extract(minute from now())::integer % p_window_secs) * interval '1 second');

  -- Prune old windows
  DELETE FROM rate_limits
  WHERE key = p_key
    AND window_start < now() - (p_window_secs * interval '1 second');

  -- Upsert current window
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE
    SET count = rate_limits.count + 1;

  -- Read the count
  SELECT count INTO v_count
  FROM rate_limits
  WHERE key = p_key AND window_start = v_window;

  RETURN v_count <= p_max;
END;
$$;

REVOKE EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) TO service_role;
