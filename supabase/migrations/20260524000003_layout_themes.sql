-- Migration: Builder Layout Themes
-- Adds is_active flag to layout_schemas so one layout can be the "active" kiosk theme

-- Add is_active column
alter table public.layout_schemas
  add column if not exists is_active boolean not null default false;

-- Ensure only one layout_schema is active at a time via a partial unique index
create unique index if not exists idx_layout_schemas_one_active
  on public.layout_schemas (is_active)
  where (is_active = true);

-- Existing anon read policy (Flutter polls the active layout)
drop policy if exists "Public can read active layout_schemas" on public.layout_schemas;

create policy "Public can read active layout_schemas"
  on public.layout_schemas for select to anon
  using (is_active = true);

-- Grant anon read
grant select on public.layout_schemas to anon;
