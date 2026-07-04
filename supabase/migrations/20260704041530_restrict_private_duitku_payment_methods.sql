do $$
begin
  if to_regclass('public.organization_payment_gateways') is not null then
    update public.organization_payment_gateways
    set
      sandbox = false,
      payment_method = case
        when upper(trim(payment_method)) = 'SP' then 'SP'
        else 'SQ'
      end,
      updated_at = now()
    where provider = 'duitku';

    alter table public.organization_payment_gateways
      alter column sandbox set default false;

    alter table public.organization_payment_gateways
      drop constraint if exists organization_payment_gateways_payment_method_check;

    alter table public.organization_payment_gateways
      add constraint organization_payment_gateways_payment_method_check
      check (payment_method in ('SP', 'SQ'));
  end if;
end $$;
