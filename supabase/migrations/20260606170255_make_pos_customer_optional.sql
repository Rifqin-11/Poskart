alter table public.pos_sales
  alter column customer_name drop not null;

notify pgrst, 'reload schema';
