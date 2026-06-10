-- Migration: add gallery_retention_days to app_configs for auto-deletion policy
alter table public.app_configs
  add column if not exists gallery_retention_days integer not null default 30;
