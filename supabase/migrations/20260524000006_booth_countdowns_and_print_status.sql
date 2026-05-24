-- Migration: per-booth countdown overrides + per-transaction print job status.
-- Lets admins tune session/payment countdowns per device and reprint failed
-- print jobs from the Booth Devices page.

alter table public.booths
  add column if not exists session_countdown_seconds integer
    check (
      session_countdown_seconds is null
      or session_countdown_seconds between 1 and 60
    ),
  add column if not exists payment_countdown_seconds integer
    check (
      payment_countdown_seconds is null
      or payment_countdown_seconds between 10 and 600
    );

alter table public.transactions
  add column if not exists print_status text
    not null
    default 'pending'
    check (print_status in ('pending', 'printed', 'failed', 'reprinting')),
  add column if not exists print_attempts integer not null default 0,
  add column if not exists print_last_error text,
  add column if not exists print_last_attempt_at timestamptz;
