create or replace function public.get_pos_sales_page(
  p_page integer default 1,
  p_page_size integer default 10,
  p_search text default null,
  p_package_code text default null,
  p_payment_method text default null,
  p_date date default null
)
returns table (
  id uuid,
  package_code text,
  package_name text,
  print_count integer,
  amount integer,
  payment_method text,
  notes text,
  created_at timestamptz,
  full_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ps.id,
    ps.package_code,
    ps.package_name,
    ps.print_count,
    ps.amount,
    ps.payment_method,
    ps.notes,
    ps.created_at,
    count(*) over()::bigint as full_count
  from public.pos_sales ps
  where ps.organization_id = public.get_auth_organization_id()
    and (
      nullif(trim(p_search), '') is null
      or ps.id::text ilike '%' || trim(p_search) || '%'
      or coalesce(ps.notes, '') ilike '%' || trim(p_search) || '%'
    )
    and (
      nullif(trim(p_package_code), '') is null
      or ps.package_code = p_package_code
    )
    and (
      nullif(trim(p_payment_method), '') is null
      or ps.payment_method = p_payment_method
    )
    and (
      p_date is null
      or timezone('Asia/Jakarta', ps.created_at)::date = p_date
    )
  order by ps.created_at desc, ps.id desc
  limit greatest(1, least(coalesce(p_page_size, 10), 500))
  offset (
    greatest(coalesce(p_page, 1), 1) - 1
  ) * greatest(1, least(coalesce(p_page_size, 10), 500));
$$;

create or replace function public.get_pos_sales_summary(
  p_search text default null,
  p_package_code text default null,
  p_payment_method text default null,
  p_date date default null
)
returns table (
  revenue numeric,
  prints bigint,
  transactions bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(ps.amount), 0)::numeric as revenue,
    coalesce(sum(ps.print_count), 0)::bigint as prints,
    count(*)::bigint as transactions
  from public.pos_sales ps
  where ps.organization_id = public.get_auth_organization_id()
    and (
      nullif(trim(p_search), '') is null
      or ps.id::text ilike '%' || trim(p_search) || '%'
      or coalesce(ps.notes, '') ilike '%' || trim(p_search) || '%'
    )
    and (
      nullif(trim(p_package_code), '') is null
      or ps.package_code = p_package_code
    )
    and (
      nullif(trim(p_payment_method), '') is null
      or ps.payment_method = p_payment_method
    )
    and (
      p_date is null
      or timezone('Asia/Jakarta', ps.created_at)::date = p_date
    );
$$;

create or replace function public.get_pos_dashboard_stats()
returns table (
  period_day date,
  package_name text,
  payment_method text,
  transaction_count bigint,
  print_count bigint,
  revenue numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    timezone('Asia/Jakarta', ps.created_at)::date as period_day,
    coalesce(nullif(trim(ps.package_name), ''), 'No package')::text,
    ps.payment_method::text,
    count(*)::bigint,
    coalesce(sum(ps.print_count), 0)::bigint,
    coalesce(sum(ps.amount), 0)::numeric
  from public.pos_sales ps
  where ps.organization_id = public.get_auth_organization_id()
  group by
    timezone('Asia/Jakarta', ps.created_at)::date,
    coalesce(nullif(trim(ps.package_name), ''), 'No package'),
    ps.payment_method
  order by period_day desc;
$$;

revoke all on function public.get_pos_sales_page(integer, integer, text, text, text, date) from public;
revoke all on function public.get_pos_sales_summary(text, text, text, date) from public;
revoke all on function public.get_pos_dashboard_stats() from public;

grant execute on function public.get_pos_sales_page(integer, integer, text, text, text, date) to authenticated;
grant execute on function public.get_pos_sales_summary(text, text, text, date) to authenticated;
grant execute on function public.get_pos_dashboard_stats() to authenticated;

notify pgrst, 'reload schema';
