create or replace function public.get_transaction_summary(
  p_status text default 'all',
  p_payment_method text default 'all',
  p_package_name text default '',
  p_search text default '',
  p_date date default null
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
  select
    count(*)::bigint as transaction_count,
    count(*) filter (
      where (t.status = 'paid' or t.paid_at is not null)
        and not (t.archive_reason = 'testing' or t.payout_status = 'testing')
        and not (t.archived_at is not null and t.archive_reason <> 'testing')
    )::bigint as paid_count,
    coalesce(sum(t.print_count) filter (
      where (t.status = 'paid' or t.paid_at is not null)
        and not (t.archive_reason = 'testing' or t.payout_status = 'testing')
        and not (t.archived_at is not null and t.archive_reason <> 'testing')
    ), 0)::bigint as print_count,
    coalesce(sum(t.amount) filter (
      where (t.status = 'paid' or t.paid_at is not null)
        and not (t.archive_reason = 'testing' or t.payout_status = 'testing')
        and not (t.archived_at is not null and t.archive_reason <> 'testing')
    ), 0)::numeric as gross_revenue,
    coalesce(sum(t.amount) filter (
      where t.provider = 'QRIS'
        and (t.status = 'paid' or t.paid_at is not null)
        and not (t.archive_reason = 'testing' or t.payout_status = 'testing')
        and not (t.archived_at is not null and t.archive_reason <> 'testing')
    ), 0)::numeric as qris_gross_revenue,
    count(*) filter (
      where t.provider = 'QRIS'
        and (t.status = 'paid' or t.paid_at is not null)
        and not (t.archive_reason = 'testing' or t.payout_status = 'testing')
        and not (t.archived_at is not null and t.archive_reason <> 'testing')
    )::bigint as qris_paid_count
  from public.transactions t
  where t.organization_id = public.get_auth_organization_id()
    and not (
      t.provider = 'QRIS'
      and t.status = 'pending'
      and t.merchant_order_id is null
    )
    and (
      (
        p_status = 'archive'
        and t.archived_at is not null
        and t.archive_reason <> 'testing'
      )
      or (
        p_status = 'testing'
        and (t.archive_reason = 'testing' or t.payout_status = 'testing')
      )
      or (
        p_status not in ('archive', 'testing')
        and t.archived_at is null
        and t.archive_reason is null
        and (p_status = 'all' or t.status = p_status)
      )
    )
    and (p_payment_method = 'all' or t.provider = p_payment_method)
    and (
      nullif(trim(p_package_name), '') is null
      or t.package_name ilike '%' || trim(p_package_name) || '%'
    )
    and (
      nullif(trim(p_search), '') is null
      or t.id ilike '%' || trim(p_search) || '%'
      or t.booth ilike '%' || trim(p_search) || '%'
      or t.customer ilike '%' || trim(p_search) || '%'
      or t.package_name ilike '%' || trim(p_search) || '%'
    )
    and (
      p_date is null
      or (
        t.created_at >= p_date::timestamptz
        and t.created_at < (p_date + 1)::timestamptz
      )
    );
$$;

revoke all on function public.get_transaction_summary(text, text, text, text, date)
  from public;
grant execute on function public.get_transaction_summary(text, text, text, text, date)
  to authenticated;
