create table if not exists public.voucher_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  generation_type text not null check (generation_type in ('random', 'sequential', 'reusable')),
  prefix text,
  reusable_code text,
  total_codes integer not null default 0 check (total_codes >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voucher_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.voucher_campaigns(id) on delete cascade,
  device_id text not null references public.devices(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  allocated_count integer not null default 0 check (allocated_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, device_id)
);

create table if not exists public.voucher_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.voucher_campaigns(id) on delete cascade,
  allocation_id uuid not null references public.voucher_allocations(id) on delete cascade,
  code text not null,
  reusable boolean not null default false,
  redemption_count integer not null default 0 check (redemption_count >= 0),
  last_redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (allocation_id, code)
);

create index if not exists voucher_campaigns_organization_created_idx
  on public.voucher_campaigns (organization_id, created_at desc);
create index if not exists voucher_allocations_device_idx
  on public.voucher_allocations (organization_id, device_id, updated_at desc);
create index if not exists voucher_codes_allocation_idx
  on public.voucher_codes (allocation_id, code);

alter table public.voucher_campaigns enable row level security;
alter table public.voucher_allocations enable row level security;
alter table public.voucher_codes enable row level security;

create policy "voucher campaigns are visible to organization members"
  on public.voucher_campaigns for select
  using (organization_id in (select public.auth_organization_ids()));
create policy "voucher campaigns are manageable by organization admins"
  on public.voucher_campaigns for all
  using (organization_id in (select public.auth_manageable_organization_ids()))
  with check (organization_id in (select public.auth_manageable_organization_ids()));

create policy "voucher allocations are visible to organization members"
  on public.voucher_allocations for select
  using (organization_id in (select public.auth_organization_ids()));
create policy "voucher allocations are manageable by organization admins"
  on public.voucher_allocations for all
  using (organization_id in (select public.auth_manageable_organization_ids()))
  with check (organization_id in (select public.auth_manageable_organization_ids()));

create policy "voucher codes are visible to organization members"
  on public.voucher_codes for select
  using (organization_id in (select public.auth_organization_ids()));
create policy "voucher codes are manageable by organization admins"
  on public.voucher_codes for all
  using (organization_id in (select public.auth_manageable_organization_ids()))
  with check (organization_id in (select public.auth_manageable_organization_ids()));
