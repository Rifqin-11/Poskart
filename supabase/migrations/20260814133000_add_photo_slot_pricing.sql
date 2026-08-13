alter table public.pricing_products
  add column if not exists pricing_mode text not null default 'flat',
  add column if not exists photo_slot_price integer,
  add column if not exists photo_slot_promo_price integer;

alter table public.pricing_products
  drop constraint if exists pricing_products_pricing_mode_check,
  drop constraint if exists pricing_products_photo_slot_price_check,
  drop constraint if exists pricing_products_photo_slot_promo_price_check;

alter table public.pricing_products
  add constraint pricing_products_pricing_mode_check
    check (pricing_mode in ('flat', 'per_photo_slot')),
  add constraint pricing_products_photo_slot_price_check
    check (photo_slot_price is null or photo_slot_price >= 0),
  add constraint pricing_products_photo_slot_promo_price_check
    check (photo_slot_promo_price is null or photo_slot_promo_price >= 0);

comment on column public.pricing_products.pricing_mode is
  'flat uses price per session; per_photo_slot multiplies photo_slot_price by the selected frame photo_count.';

alter table public.transactions
  add column if not exists pricing_mode text,
  add column if not exists pricing_unit_amount integer,
  add column if not exists photo_slot_count integer,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

alter table public.transactions
  drop constraint if exists transactions_pricing_mode_check,
  drop constraint if exists transactions_pricing_unit_amount_check,
  drop constraint if exists transactions_photo_slot_count_check;

alter table public.transactions
  add constraint transactions_pricing_mode_check
    check (pricing_mode is null or pricing_mode in ('flat', 'per_photo_slot')),
  add constraint transactions_pricing_unit_amount_check
    check (pricing_unit_amount is null or pricing_unit_amount >= 0),
  add constraint transactions_photo_slot_count_check
    check (photo_slot_count is null or photo_slot_count between 1 and 12);

alter table public.pos_sales
  add column if not exists template_id text references public.templates(id) on delete set null,
  add column if not exists pricing_mode text,
  add column if not exists pricing_unit_amount integer,
  add column if not exists photo_slot_count integer,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

alter table public.pos_sales
  drop constraint if exists pos_sales_pricing_mode_check,
  drop constraint if exists pos_sales_pricing_unit_amount_check,
  drop constraint if exists pos_sales_photo_slot_count_check;

alter table public.pos_sales
  add constraint pos_sales_pricing_mode_check
    check (pricing_mode is null or pricing_mode in ('flat', 'per_photo_slot')),
  add constraint pos_sales_pricing_unit_amount_check
    check (pricing_unit_amount is null or pricing_unit_amount >= 0),
  add constraint pos_sales_photo_slot_count_check
    check (photo_slot_count is null or photo_slot_count between 1 and 12);

create index if not exists pos_sales_template_id_idx
  on public.pos_sales (organization_id, template_id);

notify pgrst, 'reload schema';
