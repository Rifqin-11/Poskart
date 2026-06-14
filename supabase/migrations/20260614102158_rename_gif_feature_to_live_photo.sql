alter table public.pricing_products
  add column if not exists live_photo_enabled boolean not null default false;

update public.pricing_products
set live_photo_enabled = gif_enabled
where live_photo_enabled is distinct from gif_enabled;

update public.pricing_products
set gif_enabled = false
where gif_enabled = true;

comment on column public.pricing_products.live_photo_enabled is
  'Enables the Live Photo capture and download feature. Files are currently encoded as GIF for compatibility.';

comment on column public.pricing_products.gif_enabled is
  'Enables a GIF assembled from raw photo slots in capture order.';
