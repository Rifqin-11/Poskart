create table if not exists public.voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  voucher_code_id uuid not null references public.voucher_codes(id) on delete cascade,
  allocation_id uuid not null references public.voucher_allocations(id) on delete cascade,
  device_id text not null references public.devices(id) on delete cascade,
  client_event_id text not null,
  redeemed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (device_id, client_event_id)
);

create index if not exists voucher_redemptions_code_idx
  on public.voucher_redemptions (voucher_code_id, redeemed_at desc);

alter table public.voucher_redemptions enable row level security;

create policy "voucher redemptions are visible to organization members"
  on public.voucher_redemptions for select
  using (organization_id in (select public.auth_organization_ids()));

create policy "voucher redemptions are insertable by organization members"
  on public.voucher_redemptions for insert
  with check (organization_id in (select public.auth_organization_ids()));
