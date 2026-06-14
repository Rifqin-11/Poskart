update public.pricing_products
set gif_enabled = false
where gif_enabled = true
  and live_photo_enabled = true;

comment on column public.pricing_products.gif_enabled is
  'Enables a GIF assembled from raw photo slots in capture order.';
