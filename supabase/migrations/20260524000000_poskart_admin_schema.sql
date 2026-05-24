create extension if not exists pgcrypto with schema extensions;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'builder-assets',
  'builder-assets',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.kpi_metrics (
  id text primary key,
  label text not null,
  value text not null,
  delta text not null,
  tone text not null check (tone in ('neutral', 'positive', 'warning')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chart_points (
  id text primary key,
  period text not null check (period in ('weekly', 'monthly')),
  label text not null,
  revenue integer not null default 0,
  transactions integer not null default 0,
  downloads integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  booth text not null,
  location text not null,
  customer text not null,
  package_name text not null,
  amount integer not null default 0,
  status text not null check (status in ('paid', 'pending', 'failed', 'refunded')),
  provider text not null check (provider in ('QRIS', 'Cash')),
  created_at_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booths (
  id text primary key,
  name text not null,
  location text not null,
  status text not null check (status in ('online', 'offline', 'maintenance')),
  battery integer not null default 0 check (battery >= 0 and battery <= 100),
  app_version text not null,
  last_sync text not null,
  theme text not null,
  template text not null,
  pricing_profile text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id text primary key,
  name text not null,
  category text not null check (category in ('receipt', 'frame', 'postcard', 'seasonal', 'event')),
  status text not null check (status in ('published', 'draft', 'archived')),
  assigned_booths integer not null default 0,
  updated_at_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_products (
  id text primary key,
  name text not null,
  price integer not null default 0,
  promo_price integer,
  print_limit integer not null default 1,
  qris_download boolean not null default true,
  gif_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id text primary key,
  name text not null,
  plan text not null,
  status text not null check (status in ('active', 'trial', 'paused')),
  booths integer not null default 0,
  users integer not null default 0,
  renewal_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.theme_presets (
  id text primary key,
  name text not null,
  status text not null check (status in ('draft', 'published')),
  schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id text primary key,
  name text not null,
  folder text not null,
  tag text not null,
  version text not null,
  size text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.layout_schemas (
  id text primary key,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_orders (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  plan_name text not null,
  amount integer not null,
  customer_name text not null,
  email text not null,
  whatsapp text not null,
  company_name text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kpi_metrics enable row level security;
alter table public.chart_points enable row level security;
alter table public.transactions enable row level security;
alter table public.booths enable row level security;
alter table public.templates enable row level security;
alter table public.pricing_products enable row level security;
alter table public.tenants enable row level security;
alter table public.theme_presets enable row level security;
alter table public.assets enable row level security;
alter table public.layout_schemas enable row level security;
alter table public.subscription_orders enable row level security;

drop policy if exists "Authenticated users can manage kpi_metrics" on public.kpi_metrics;
drop policy if exists "Authenticated users can manage chart_points" on public.chart_points;
drop policy if exists "Authenticated users can manage transactions" on public.transactions;
drop policy if exists "Authenticated users can manage booths" on public.booths;
drop policy if exists "Authenticated users can manage templates" on public.templates;
drop policy if exists "Authenticated users can manage pricing_products" on public.pricing_products;
drop policy if exists "Authenticated users can manage tenants" on public.tenants;
drop policy if exists "Authenticated users can manage theme_presets" on public.theme_presets;
drop policy if exists "Authenticated users can manage assets" on public.assets;
drop policy if exists "Authenticated users can manage layout_schemas" on public.layout_schemas;
drop policy if exists "Authenticated users can read subscription_orders" on public.subscription_orders;
drop policy if exists "Public users can create subscription_orders" on public.subscription_orders;
drop policy if exists "Authenticated users can update subscription_orders" on public.subscription_orders;
drop policy if exists "Authenticated users can upload builder assets" on storage.objects;
drop policy if exists "Authenticated users can update builder assets" on storage.objects;
drop policy if exists "Authenticated users can delete builder assets" on storage.objects;
drop policy if exists "Public users can read builder assets" on storage.objects;

create policy "Authenticated users can manage kpi_metrics"
  on public.kpi_metrics for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage chart_points"
  on public.chart_points for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage transactions"
  on public.transactions for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage booths"
  on public.booths for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage templates"
  on public.templates for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage pricing_products"
  on public.pricing_products for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage tenants"
  on public.tenants for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage theme_presets"
  on public.theme_presets for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage assets"
  on public.assets for all to authenticated
  using (true) with check (true);
create policy "Authenticated users can manage layout_schemas"
  on public.layout_schemas for all to authenticated
  using (true) with check (true);

create policy "Authenticated users can read subscription_orders"
  on public.subscription_orders for select to authenticated
  using (true);
create policy "Public users can create subscription_orders"
  on public.subscription_orders for insert to anon, authenticated
  with check (true);
create policy "Authenticated users can update subscription_orders"
  on public.subscription_orders for update to authenticated
  using (true) with check (true);

create policy "Public users can read builder assets"
  on storage.objects for select to public
  using (bucket_id = 'builder-assets');
create policy "Authenticated users can upload builder assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'builder-assets');
create policy "Authenticated users can update builder assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'builder-assets')
  with check (bucket_id = 'builder-assets');
create policy "Authenticated users can delete builder assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'builder-assets');

grant select, insert, update, delete on public.kpi_metrics to authenticated;
grant select, insert, update, delete on public.chart_points to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.booths to authenticated;
grant select, insert, update, delete on public.templates to authenticated;
grant select, insert, update, delete on public.pricing_products to authenticated;
grant select, insert, update, delete on public.tenants to authenticated;
grant select, insert, update, delete on public.theme_presets to authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert, update, delete on public.layout_schemas to authenticated;
grant select, insert, update on public.subscription_orders to authenticated;
grant insert on public.subscription_orders to anon;
