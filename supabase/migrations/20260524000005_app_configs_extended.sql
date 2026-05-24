-- Migration: extend app_configs with operational settings used by the
-- admin Settings page (Payment / Booth / Media / System tabs).

alter table public.app_configs
  -- Payment
  add column if not exists qris_provider_merchant_id text not null default '',
  add column if not exists qris_webhook_secret text not null default '',
  add column if not exists qris_auto_retry boolean not null default true,
  -- Booth
  add column if not exists printer_name text not null default 'POSKART-THERMAL-01',
  add column if not exists booth_timeout_seconds integer not null default 90,
  -- Media
  add column if not exists download_expiry_hours integer not null default 72,
  add column if not exists storage_provider text not null default 'Supabase Storage',
  add column if not exists watermark_enabled boolean not null default true,
  -- System
  add column if not exists maintenance_mode boolean not null default false;
