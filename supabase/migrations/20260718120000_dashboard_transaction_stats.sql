create or replace function public.get_dashboard_transaction_stats()
returns table (
  period_day date,
  provider text,
  package_name text,
  transaction_count bigint,
  paid_count bigint,
  print_count bigint,
  gross_revenue numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    timezone('Asia/Jakarta', t.created_at)::date as period_day,
    coalesce(t.provider, 'Unknown')::text as provider,
    coalesce(nullif(trim(t.package_name), ''), 'No package')::text as package_name,
    count(*)::bigint as transaction_count,
    count(*) filter (
      where t.status = 'paid' or t.paid_at is not null
    )::bigint as paid_count,
    coalesce(sum(t.print_count) filter (
      where t.status = 'paid' or t.paid_at is not null
    ), 0)::bigint as print_count,
    coalesce(sum(t.amount) filter (
      where t.status = 'paid' or t.paid_at is not null
    ), 0)::numeric as gross_revenue
  from public.transactions t
  where t.organization_id = public.get_auth_organization_id()
    and t.archived_at is null
    and t.archive_reason is null
    and coalesce(t.payout_status, '') <> 'testing'
    and coalesce(t.provider, '') <> 'Event'
    and not (
      t.provider = 'QRIS'
      and t.status = 'pending'
      and t.merchant_order_id is null
    )
  group by
    timezone('Asia/Jakarta', t.created_at)::date,
    coalesce(t.provider, 'Unknown'),
    coalesce(nullif(trim(t.package_name), ''), 'No package')
  order by period_day desc;
$$;

revoke all on function public.get_dashboard_transaction_stats() from public;
grant execute on function public.get_dashboard_transaction_stats() to authenticated;
