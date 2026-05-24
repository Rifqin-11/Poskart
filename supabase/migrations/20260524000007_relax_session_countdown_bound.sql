-- Migration: relax the upper bound on per-booth session countdown.
-- 60 seconds was too short — operators need minutes for the full booth flow
-- (template → camera → preview → thanks). Bump to 30 seconds .. 30 minutes.

alter table public.booths
  drop constraint if exists booths_session_countdown_seconds_check;

alter table public.booths
  add constraint booths_session_countdown_seconds_check
  check (
    session_countdown_seconds is null
    or session_countdown_seconds between 30 and 1800
  );
