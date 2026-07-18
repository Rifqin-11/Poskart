do $$
declare
  voucher_function regprocedure;
begin
  for voucher_function in
    select procedure.oid::regprocedure
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'redeem_organization_voucher'
  loop
    execute format('drop function if exists %s cascade', voucher_function);
  end loop;
end;
$$;

drop table if exists public.organization_voucher_redemptions cascade;
drop table if exists public.organization_vouchers cascade;
