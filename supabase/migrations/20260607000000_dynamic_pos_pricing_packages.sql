do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.pos_sales'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%package_code%'
  loop
    execute format(
      'alter table public.pos_sales drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.pos_sales
  alter column package_code type text;

notify pgrst, 'reload schema';
