-- A kiosk QRIS payment can be cancelled locally before Duitku confirms a
-- payment. The original transaction status constraint omitted `cancelled`,
-- causing that valid transition to fail with a database error.
do $$
declare
  status_constraint record;
begin
  for status_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%(status = ANY%'
  loop
    execute format(
      'alter table public.transactions drop constraint if exists %I',
      status_constraint.conname
    );
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_status_check
  check (status in ('paid', 'pending', 'failed', 'refunded', 'cancelled'));

notify pgrst, 'reload schema';
