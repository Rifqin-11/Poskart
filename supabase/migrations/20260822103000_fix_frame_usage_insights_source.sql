-- Frame cards use templates.usage_count, which is maintained from
-- transactions.template_id. Use the same canonical source for Frame Insights
-- so historical usage does not depend on gallery_sessions.template_id.

create index if not exists transactions_organization_template_created_idx
  on public.transactions (organization_id, template_id, created_at desc)
  where template_id is not null;

create or replace function public.get_frame_usage_insights(
  p_from_at timestamptz default null
)
returns table (
  template_id text,
  session_count bigint,
  active_days bigint,
  last_used_at timestamptz,
  assigned_devices bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with frame_templates as (
    select
      t.id,
      coalesce(t.usage_count, 0)::bigint as lifetime_usage_count
    from public.templates as t
    where t.organization_id = public.get_auth_organization_id()
      and t.category = 'frame'
  ), transaction_usage as (
    select
      tx.template_id,
      count(*)::bigint as session_count,
      count(distinct timezone('Asia/Jakarta', tx.created_at)::date)::bigint
        as active_days,
      max(tx.created_at) as last_used_at
    from public.transactions as tx
    join frame_templates as ft on ft.id = tx.template_id
    where tx.organization_id = public.get_auth_organization_id()
      and tx.template_id is not null
      and tx.archived_at is null
      and coalesce(tx.archive_reason, '') <> 'testing'
      and coalesce(tx.payout_status, '') <> 'testing'
      and (p_from_at is null or tx.created_at >= p_from_at)
    group by tx.template_id
  ), device_usage as (
    select
      dft.template_id,
      count(*)::bigint as assigned_devices
    from public.device_frame_templates as dft
    join frame_templates as ft on ft.id = dft.template_id
    where dft.organization_id = public.get_auth_organization_id()
    group by dft.template_id
  )
  select
    ft.id as template_id,
    case
      when p_from_at is null then ft.lifetime_usage_count
      else coalesce(tu.session_count, 0)::bigint
    end as session_count,
    coalesce(tu.active_days, 0)::bigint as active_days,
    tu.last_used_at,
    coalesce(du.assigned_devices, 0)::bigint as assigned_devices
  from frame_templates as ft
  left join transaction_usage as tu on tu.template_id = ft.id
  left join device_usage as du on du.template_id = ft.id
  order by session_count desc, ft.id;
$$;

revoke all on function public.get_frame_usage_insights(timestamptz) from public;
grant execute on function public.get_frame_usage_insights(timestamptz) to authenticated;
