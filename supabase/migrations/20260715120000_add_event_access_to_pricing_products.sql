alter table public.pricing_products
  add column if not exists access_mode text not null default 'paid',
  add column if not exists event_name text,
  add column if not exists event_expires_at timestamptz;

alter table public.pricing_products
  drop constraint if exists pricing_products_access_mode_check;

alter table public.pricing_products
  add constraint pricing_products_access_mode_check
  check (access_mode in ('paid', 'event'));

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%provider%'
  loop
    execute format(
      'alter table public.transactions drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_provider_check
  check (provider in ('QRIS', 'Cash', 'Voucher', 'Event'));

comment on column public.pricing_products.access_mode is
  'paid requires the normal payment flow; event opens a complimentary event session';
comment on column public.pricing_products.event_expires_at is
  'Optional UTC expiry for event access';

notify pgrst, 'reload schema';
