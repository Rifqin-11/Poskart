alter table public.pricing_products
  add column if not exists photo_slot_prices jsonb not null default '[]'::jsonb;

alter table public.pricing_products
  drop constraint if exists pricing_products_photo_slot_prices_array_check;

alter table public.pricing_products
  add constraint pricing_products_photo_slot_prices_array_check
    check (jsonb_typeof(photo_slot_prices) = 'array');

comment on column public.pricing_products.photo_slot_prices is
  'Exact final prices by frame photo-slot count. Empty arrays retain the legacy per-slot multiplication behavior.';

notify pgrst, 'reload schema';
