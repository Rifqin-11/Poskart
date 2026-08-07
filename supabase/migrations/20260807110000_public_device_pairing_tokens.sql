-- A kiosk may request a short pairing code before any human account is signed
-- in on the tablet. The dashboard claims that request and activates the
-- device-bound credential; no administrator refresh token reaches the kiosk.

alter table public.device_pairings
  alter column organization_id drop not null;

alter table public.device_pairings
  add column if not exists device_token_hash text,
  add column if not exists device_token_revoked_at timestamptz,
  add column if not exists claimed_by_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists device_pairings_device_token_active_idx
  on public.device_pairings (id, device_token_hash)
  where device_token_hash is not null and device_token_revoked_at is null;

-- A pairing code is still completed only after its organization is claimed by
-- an owner/admin through the existing service-role RPC.
