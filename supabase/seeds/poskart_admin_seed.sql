insert into public.kpi_metrics (id, label, value, delta, tone, sort_order) values
  ('revenue-today', 'Revenue today', 'Rp 4.820.000', '+18.4%', 'positive', 1),
  ('revenue-month', 'Revenue this month', 'Rp 128.6jt', '+12.8%', 'positive', 2),
  ('transactions-today', 'Transactions today', '326', '+41 orders', 'positive', 3),
  ('qris-success-rate', 'QRIS success rate', '98.7%', '0.4% failed', 'neutral', 4)
on conflict (id) do update set
  label = excluded.label,
  value = excluded.value,
  delta = excluded.delta,
  tone = excluded.tone,
  sort_order = excluded.sort_order;

insert into public.chart_points (id, period, label, revenue, transactions, downloads, sort_order) values
  ('weekly-mon', 'weekly', 'Mon', 3200000, 198, 120, 1),
  ('weekly-tue', 'weekly', 'Tue', 4100000, 244, 162, 2),
  ('weekly-wed', 'weekly', 'Wed', 3700000, 226, 151, 3),
  ('weekly-thu', 'weekly', 'Thu', 5200000, 309, 219, 4),
  ('weekly-fri', 'weekly', 'Fri', 6100000, 354, 258, 5),
  ('weekly-sat', 'weekly', 'Sat', 8900000, 512, 389, 6),
  ('weekly-sun', 'weekly', 'Sun', 7600000, 438, 332, 7),
  ('monthly-jan', 'monthly', 'Jan', 73000000, 4012, null, 1),
  ('monthly-feb', 'monthly', 'Feb', 82000000, 4421, null, 2),
  ('monthly-mar', 'monthly', 'Mar', 91000000, 5029, null, 3),
  ('monthly-apr', 'monthly', 'Apr', 103000000, 5684, null, 4),
  ('monthly-may', 'monthly', 'May', 128600000, 6942, null, 5)
on conflict (id) do update set
  period = excluded.period,
  label = excluded.label,
  revenue = excluded.revenue,
  transactions = excluded.transactions,
  downloads = excluded.downloads,
  sort_order = excluded.sort_order;

insert into public.transactions (id, booth, location, customer, package_name, amount, status, provider, created_at_label) values
  ('TRX-9251', 'Booth 01', 'PVJ Bandung', 'Raka', 'Double Print', 10000, 'paid', 'QRIS', '2 min ago'),
  ('TRX-9250', 'Booth 03', 'Cihampelas Walk', 'Nadya', 'Single Print', 7000, 'pending', 'QRIS', '6 min ago'),
  ('TRX-9249', 'Booth 02', 'Braga Citywalk', 'Faris', 'Double Print', 10000, 'paid', 'QRIS', '8 min ago'),
  ('TRX-9248', 'Booth 04', 'Festival Citylink', 'Mira', 'Live Photo Bundle', 15000, 'failed', 'QRIS', '14 min ago'),
  ('TRX-9247', 'Booth 01', 'PVJ Bandung', 'Dimas', 'Single Print', 7000, 'paid', 'QRIS', '21 min ago')
on conflict (id) do update set
  booth = excluded.booth,
  location = excluded.location,
  customer = excluded.customer,
  package_name = excluded.package_name,
  amount = excluded.amount,
  status = excluded.status,
  provider = excluded.provider,
  created_at_label = excluded.created_at_label;

insert into public.booths (id, name, location, status, battery, app_version, last_sync, theme, template, pricing_profile) values
  ('BTH-01', 'Booth 01', 'PVJ Bandung', 'online', 88, '2.7.1', '30 sec ago', 'Mono Receipt', 'Classic Receipt', 'Bandung Standard'),
  ('BTH-02', 'Booth 02', 'Braga Citywalk', 'online', 72, '2.7.1', '1 min ago', 'Navy Premium', 'Postcard Night', 'Weekend Promo'),
  ('BTH-03', 'Booth 03', 'Cihampelas Walk', 'maintenance', 41, '2.6.9', '19 min ago', 'POSKART Red', 'Seasonal Stamp', 'Opening Promo'),
  ('BTH-04', 'Booth 04', 'Festival Citylink', 'offline', 12, '2.6.8', '2 hours ago', 'Mono Receipt', 'Classic Receipt', 'Bandung Standard')
on conflict (id) do update set
  name = excluded.name,
  location = excluded.location,
  status = excluded.status,
  battery = excluded.battery,
  app_version = excluded.app_version,
  last_sync = excluded.last_sync,
  theme = excluded.theme,
  template = excluded.template,
  pricing_profile = excluded.pricing_profile;

insert into public.templates (id, name, category, status, assigned_booths, updated_at_label) values
  ('TPL-01', 'Classic Receipt', 'receipt', 'published', 14, 'Today'),
  ('TPL-02', 'Postcard Night', 'postcard', 'published', 6, 'Yesterday'),
  ('TPL-03', 'Seasonal Stamp', 'seasonal', 'draft', 0, '2 days ago'),
  ('TPL-04', 'Wedding Frame', 'event', 'published', 3, '4 days ago')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  status = excluded.status,
  assigned_booths = excluded.assigned_booths,
  updated_at_label = excluded.updated_at_label;

insert into public.pricing_products (id, name, price, promo_price, print_limit, qris_download, live_photo_enabled, gif_enabled, active) values
  ('PRC-01', 'Single Print', 7000, null, 1, true, false, false, true),
  ('PRC-02', 'Double Print', 10000, 9000, 2, true, false, false, true),
  ('PRC-03', 'Live Photo Bundle', 15000, null, 2, true, true, false, true)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  promo_price = excluded.promo_price,
  print_limit = excluded.print_limit,
  qris_download = excluded.qris_download,
  live_photo_enabled = excluded.live_photo_enabled,
  gif_enabled = excluded.gif_enabled,
  active = excluded.active;

insert into public.tenants (id, name, plan, status, booths, users, renewal_date) values
  ('TNT-01', 'POSKART Bandung', '1 Year', 'active', 18, 12, '2026-06-30'),
  ('TNT-02', 'POSKART Jakarta', '3 Months', 'trial', 6, 5, '2026-06-12'),
  ('TNT-03', 'Event Partner', 'Monthly', 'paused', 2, 3, '2026-05-31')
on conflict (id) do update set
  name = excluded.name,
  plan = excluded.plan,
  status = excluded.status,
  booths = excluded.booths,
  users = excluded.users,
  renewal_date = excluded.renewal_date;

insert into public.theme_presets (id, name, status, schema) values
  ('THM-01', 'Mono Receipt', 'published', '{"version":1,"colors":{"background":"#ffffff","foreground":"#18181b","accent":"#ef4444","muted":"#f4f4f5"},"typography":{"heading":"Geist","body":"Geist","receipt":"Geist Mono"},"radius":{"card":8,"button":6,"receipt":2},"shadows":{"card":"0 12px 35px rgba(24,24,27,0.08)"},"assets":{},"animationPreset":"premium"}'::jsonb),
  ('THM-02', 'Navy Premium', 'draft', '{"version":1,"colors":{"background":"#f8fafc","foreground":"#0f172a","accent":"#1d4ed8","muted":"#e2e8f0"},"typography":{"heading":"Geist","body":"Geist","receipt":"Geist Mono"},"radius":{"card":8,"button":6,"receipt":4},"shadows":{"card":"0 16px 45px rgba(15,23,42,0.10)"},"assets":{},"animationPreset":"subtle"}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  schema = excluded.schema;

insert into public.assets (id, name, folder, tag, version, size) values
  ('AST-01', 'poskart-logo.svg', 'Logos', 'brand', 'v3', '84 KB'),
  ('AST-02', 'receipt-stamp-red.png', 'Stamps', 'stamp', 'v7', '312 KB'),
  ('AST-03', 'grain-texture.webp', 'Backgrounds', 'texture', 'v2', '1.2 MB'),
  ('AST-04', 'festival-frame.png', 'Frames', 'event', 'v1', '920 KB')
on conflict (id) do update set
  name = excluded.name,
  folder = excluded.folder,
  tag = excluded.tag,
  version = excluded.version,
  size = excluded.size;

insert into public.layout_schemas (id, name, status, schema) values
  (
    'default-photobooth',
    'Default Photobooth Layout',
    'published',
    '{
      "version": 1,
      "canvas": { "width": 512, "height": 720, "orientation": "portrait", "backgroundColor": "#ffffff" },
      "pages": {
        "landing": [
          {
            "id": "node-title",
            "type": "text",
            "page": "landing",
            "x": 72,
            "y": 70,
            "width": 360,
            "height": 68,
            "rotation": 0,
            "opacity": 1,
            "locked": false,
            "visible": true,
            "zIndex": 5,
            "props": { "content": "POSKART", "fontSize": 42, "fontWeight": 700, "color": "#18181b" }
          },
          {
            "id": "node-subtitle",
            "type": "text",
            "page": "landing",
            "x": 78,
            "y": 132,
            "width": 320,
            "height": 48,
            "rotation": 0,
            "opacity": 0.7,
            "locked": false,
            "visible": true,
            "zIndex": 6,
            "props": { "content": "Receipt photo booth experience", "fontSize": 16, "color": "#52525b" }
          },
          {
            "id": "node-button",
            "type": "button",
            "page": "landing",
            "x": 78,
            "y": 225,
            "width": 190,
            "height": 48,
            "rotation": 0,
            "opacity": 1,
            "locked": false,
            "visible": true,
            "zIndex": 7,
            "props": { "label": "Start session", "background": "#18181b", "color": "#ffffff", "radius": 6 }
          }
        ],
        "camera": [],
        "preview": [
          {
            "id": "node-receipt",
            "type": "receipt-preview",
            "page": "preview",
            "x": 132,
            "y": 70,
            "width": 246,
            "height": 390,
            "rotation": 0,
            "opacity": 1,
            "locked": false,
            "visible": true,
            "zIndex": 4,
            "props": { "title": "POSKART MEMORY", "code": "PK-0524" }
          }
        ],
        "thanks": [
          {
            "id": "node-qr",
            "type": "qr",
            "page": "thanks",
            "x": 186,
            "y": 230,
            "width": 132,
            "height": 132,
            "rotation": 0,
            "opacity": 1,
            "locked": false,
            "visible": true,
            "zIndex": 3,
            "props": { "label": "Download" }
          }
        ]
      }
    }'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  schema = excluded.schema;
