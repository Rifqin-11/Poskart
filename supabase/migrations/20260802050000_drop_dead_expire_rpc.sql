-- expire_trialing_subscriptions() was never wired to the cron — the cron route
-- performs the same UPDATE directly. Drop to avoid confusion.
DROP FUNCTION IF EXISTS expire_trialing_subscriptions();
