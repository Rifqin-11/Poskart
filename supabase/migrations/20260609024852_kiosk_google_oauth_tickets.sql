create table if not exists public.kiosk_oauth_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  session_payload text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kiosk_oauth_tickets_expires_at_idx
  on public.kiosk_oauth_tickets (expires_at);

alter table public.kiosk_oauth_tickets enable row level security;

revoke all on table public.kiosk_oauth_tickets from anon, authenticated;
grant select, insert, update, delete on table public.kiosk_oauth_tickets to service_role;

comment on table public.kiosk_oauth_tickets is
  'Short-lived, one-time exchange tickets for POSKART kiosk OAuth callbacks.';
