alter table public.pricing_products
  add column if not exists extra_print_enabled boolean not null default false,
  add column if not exists extra_print_price bigint not null default 0;

alter table public.pricing_products
  drop constraint if exists pricing_products_extra_print_price_check,
  add constraint pricing_products_extra_print_price_check
    check (
      (not extra_print_enabled and extra_print_price >= 0)
      or (extra_print_enabled and extra_print_price > 0)
    );

alter table public.transactions
  add column if not exists ordered_print_count integer;

alter table public.transactions
  drop constraint if exists transactions_ordered_print_count_check,
  add constraint transactions_ordered_print_count_check
    check (ordered_print_count is null or ordered_print_count between 1 and 20);

comment on column public.pricing_products.extra_print_enabled is
  'Allows kiosk customers to buy additional print copies for this paid package.';
comment on column public.pricing_products.extra_print_price is
  'Price in IDR for each print copy above print_limit.';
comment on column public.transactions.ordered_print_count is
  'Purchased print copies. transactions.print_count remains the confirmed physical output count.';
