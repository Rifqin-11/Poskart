create table if not exists public.organization_payment_gateways (
  organization_id text primary key references public.organizations(id) on delete cascade,
  provider text not null default 'duitku',
  merchant_code text not null default '',
  api_key_ciphertext text not null default '',
  api_key_iv text not null default '',
  api_key_tag text not null default '',
  api_key_last4 text,
  sandbox boolean not null default false,
  payment_method text not null default 'SQ',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_payment_gateways_provider_check
    check (provider in ('duitku')),
  constraint organization_payment_gateways_payment_method_check
    check (char_length(trim(payment_method)) between 1 and 12)
);

comment on table public.organization_payment_gateways is
  'Private organization-owned payment gateway credentials. API keys are encrypted by the application before storage.';
comment on column public.organization_payment_gateways.api_key_ciphertext is
  'Encrypted API key ciphertext, never returned to clients in plaintext.';

alter table public.organization_payment_gateways enable row level security;

-- These credentials are read and written only through audited server actions
-- after checking organization owner/admin membership. Do not expose direct
-- authenticated Data API access to API keys.
revoke all on table public.organization_payment_gateways from anon;
revoke all on table public.organization_payment_gateways from authenticated;

create index if not exists organization_payment_gateways_provider_idx
  on public.organization_payment_gateways (provider);
