create table if not exists public.kiosk_asset_manifest (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  source_url text not null,
  delivery_url text not null,
  revision text not null,
  content_hash text,
  byte_size bigint,
  content_type text,
  updated_at timestamptz not null default now(),
  unique (organization_id, source_url)
);

create index if not exists kiosk_asset_manifest_organization_idx
  on public.kiosk_asset_manifest (organization_id, updated_at desc);

alter table public.kiosk_asset_manifest enable row level security;

drop policy if exists "Organization members can read kiosk asset manifest"
  on public.kiosk_asset_manifest;
create policy "Organization members can read kiosk asset manifest"
  on public.kiosk_asset_manifest for select to authenticated
  using (organization_id = public.get_auth_organization_id());

-- New builder uploads are delivered through R2. Keep the legacy bucket
-- readable for the fallback period, but prevent new writes to it.
drop policy if exists "builder-assets: auth upload" on storage.objects;
drop policy if exists "builder-assets: auth update" on storage.objects;
drop policy if exists "builder-assets: auth delete" on storage.objects;
