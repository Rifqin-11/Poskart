-- Migration: Poskart Flutter Config Support
-- Adds app_configs table and extends templates with Flutter-specific fields

-- ============================================================
-- 1. app_configs table — operational settings read by Flutter
-- ============================================================
create table if not exists public.app_configs (
  id text primary key default 'default',
  merchant_name text not null default 'POSKART',
  qris_payload_prefix text not null default 'qris://poskart/pay',
  share_base_url text not null default 'https://poskart.app/s',
  countdown_duration_seconds integer not null default 3 check (countdown_duration_seconds between 1 and 30),
  flash_duration_ms integer not null default 220 check (flash_duration_ms between 50 and 2000),
  auto_return_duration_seconds integer not null default 8 check (auto_return_duration_seconds between 3 and 60),
  default_template_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed with defaults so there's always a row
insert into public.app_configs (id) values ('default')
on conflict (id) do nothing;

-- ============================================================
-- 2. Extend templates table with Flutter frame template fields
-- ============================================================
alter table public.templates
  add column if not exists tagline text,
  add column if not exists photo_count integer not null default 4 check (photo_count between 1 and 8),
  add column if not exists accent_color text not null default '#C4121A',
  add column if not exists frame_image_url text,
  add column if not exists is_default boolean not null default false;

-- ============================================================
-- 3. RLS
-- ============================================================
alter table public.app_configs enable row level security;

drop policy if exists "Authenticated users can manage app_configs" on public.app_configs;
drop policy if exists "Public can read app_configs" on public.app_configs;

create policy "Authenticated users can manage app_configs"
  on public.app_configs for all to authenticated
  using (true) with check (true);

-- Flutter app reads this unauthenticated at startup
create policy "Public can read app_configs"
  on public.app_configs for select to anon
  using (true);

-- ============================================================
-- 4. Grants
-- ============================================================
grant select, insert, update, delete on public.app_configs to authenticated;
grant select on public.app_configs to anon;
