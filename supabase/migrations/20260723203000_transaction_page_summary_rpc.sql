-- Return one aggregate row for the transaction monitoring header instead of
-- transferring every matching transaction to the Next.js server.
create or replace function public.get_transaction_page_summary(
  p_status text default 'all',
  p_payment_method text default 'all',
  p_package_name text default '',
  p_search text default '',
  p_booth text default '',
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  transaction_count bigint,
  paid_count bigint,
  print_count bigint,
  gross_revenue numeric,
  qris_gross_revenue numeric,
  qris_paid_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with visible_transactions as (
    select t.*
    from public.transactions t
    where t.organization_id = public.get_auth_organization_id()
      and not (
        t.provider = 'QRIS'
        and t.status = 'pending'
        and t.merchant_order_id is null
      )
      and (
        (p_status = 'archive' and t.archived_at is not null and coalesce(t.archive_reason, '') <> 'testing')
        or (p_status = 'testing' and (t.archive_reason = 'testing' or t.payout_status = 'testing'))
        or (
          p_status not in ('archive', 'testing')
          and t.archived_at is null
          and t.archive_reason is null
          and (p_status = 'all' or t.status = p_status)
        )
      )
      and (p_payment_method = 'all' or t.provider = p_payment_method)
      and (nullif(trim(p_package_name), '') is null or t.package_name ilike '%' || trim(p_package_name) || '%')
      and (nullif(trim(p_booth), '') is null or t.booth = trim(p_booth))
      and (
        nullif(trim(p_search), '') is null
        or t.id ilike '%' || trim(p_search) || '%'
        or t.booth ilike '%' || trim(p_search) || '%'
        or t.customer ilike '%' || trim(p_search) || '%'
        or t.package_name ilike '%' || trim(p_search) || '%'
      )
      and (
        p_from_date is null
        or t.created_at >= (p_from_date::timestamp at time zone 'Asia/Jakarta')
      )
      and (
        p_to_date is null
        or t.created_at < ((p_to_date + 1)::timestamp at time zone 'Asia/Jakarta')
      )
  ), paid_transactions as (
    select *
    from visible_transactions t
    where (t.status = 'paid' or t.paid_at is not null)
      and coalesce(t.archive_reason, '') <> 'testing'
      and coalesce(t.payout_status, '') <> 'testing'
      and not (t.archived_at is not null and coalesce(t.archive_reason, '') <> 'testing')
  )
  select
    (select count(*) from visible_transactions)::bigint as transaction_count,
    count(*)::bigint as paid_count,
    coalesce(sum(print_count), 0)::bigint as print_count,
    coalesce(sum(amount), 0)::numeric as gross_revenue,
    coalesce(sum(amount) filter (where provider = 'QRIS'), 0)::numeric as qris_gross_revenue,
    count(*) filter (where provider = 'QRIS')::bigint as qris_paid_count
  from paid_transactions;
$$;

revoke all on function public.get_transaction_page_summary(text, text, text, text, text, date, date)
  from public;
grant execute on function public.get_transaction_page_summary(text, text, text, text, text, date, date)
  to authenticated;
