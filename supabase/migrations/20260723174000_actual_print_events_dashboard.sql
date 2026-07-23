-- A package's print allowance is not proof that paper was printed. Dashboard
-- aggregates therefore derive prints from idempotent confirmed print events.
drop function if exists public.get_dashboard_transaction_stats();

create function public.get_dashboard_transaction_stats()
returns table (
  period_day date,
  provider text,
  package_name text,
  transaction_count bigint,
  paid_count bigint,
  failed_count bigint,
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
    count(*) filter (
      where t.status = 'failed'
    )::bigint as failed_count,
    coalesce(sum(print_totals.copies) filter (
      where t.status = 'paid' or t.paid_at is not null
    ), 0)::bigint as print_count,
    coalesce(sum(t.amount) filter (
      where t.status = 'paid' or t.paid_at is not null
    ), 0)::numeric as gross_revenue
  from public.transactions t
  left join lateral (
    select coalesce(sum(event.copies), 0)::bigint as copies
    from public.transaction_print_events event
    where event.transaction_id = t.id
  ) print_totals on true
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
    coalesce(nullif(trim(t.package_name), ''), 'No package');
$$;

create or replace function public.record_transaction_additional_print(
  p_event_id text,
  p_organization_id text,
  p_transaction_id text,
  p_device_id text,
  p_copies integer,
  p_source text default 'kiosk_reprint'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  inserted_event boolean := false;
begin
  if not public.is_auth_admin()
    and p_organization_id <> public.get_auth_organization_id() then
    raise exception 'Unauthorized organization';
  end if;

  if nullif(trim(p_event_id), '') is null
    or nullif(trim(p_transaction_id), '') is null
    or p_copies < 1
    or p_copies > 20 then
    raise exception 'Invalid print event';
  end if;

  if p_device_id is not null and not exists (
    select 1
    from public.devices device
    where device.id = p_device_id
      and device.organization_id = p_organization_id
  ) then
    raise exception 'Invalid print device';
  end if;

  insert into public.transaction_print_events (
    event_id,
    organization_id,
    transaction_id,
    device_id,
    copies,
    source
  )
  select
    trim(p_event_id),
    p_organization_id,
    t.id,
    p_device_id,
    p_copies,
    coalesce(nullif(trim(p_source), ''), 'kiosk_reprint')
  from public.transactions t
  where t.id = p_transaction_id
    and t.organization_id = p_organization_id
  on conflict (event_id) do nothing;

  get diagnostics inserted_count = row_count;
  inserted_event := inserted_count > 0;

  if inserted_event then
    update public.transactions
    set
      print_count = greatest(0, coalesce(print_count, 0)) + p_copies,
      print_status = 'printed',
      print_last_error = null,
      updated_at = now()
    where id = p_transaction_id
      and organization_id = p_organization_id;
  end if;

  return inserted_event;
end;
$$;

revoke all on function public.get_dashboard_transaction_stats() from public;
grant execute on function public.get_dashboard_transaction_stats() to authenticated;
revoke all on function public.record_transaction_additional_print(
  text, text, text, text, integer, text
) from public;
grant execute on function public.record_transaction_additional_print(
  text, text, text, text, integer, text
) to authenticated;
