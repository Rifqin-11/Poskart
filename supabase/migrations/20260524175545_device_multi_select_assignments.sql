-- Migration: Multi-select device frame template and pricing assignments
-- Adds array columns while keeping legacy single-value columns populated.

alter table public.devices
  add column if not exists frame_templates text[] not null default '{}'::text[],
  add column if not exists pricing_profiles text[] not null default '{}'::text[];

update public.devices
set
  frame_templates = case
    when cardinality(frame_templates) > 0 then frame_templates
    when nullif(template, '') is not null then array[template]
    else '{}'::text[]
  end,
  pricing_profiles = case
    when cardinality(pricing_profiles) > 0 then pricing_profiles
    when nullif(pricing_profile, '') is not null then array[pricing_profile]
    else '{}'::text[]
  end;
