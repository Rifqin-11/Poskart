-- Aggregate frame usage on the database so Frame Management never transfers
-- every gallery session to the browser or Next.js server.

create index if not exists gallery_sessions_organization_template_created_idx
  on public.gallery_sessions (organization_id, template_id, created_at desc)
  where template_id is not null and test_mode = false;

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
    select t.id
    from public.templates as t
    where t.organization_id = public.get_auth_organization_id()
      and t.category = 'frame'
  ), session_usage as (
    select
      gs.template_id,
      count(*)::bigint as session_count,
      count(distinct timezone('Asia/Jakarta', gs.created_at)::date)::bigint
        as active_days,
      max(gs.created_at) as last_used_at
    from public.gallery_sessions as gs
    join frame_templates as ft on ft.id = gs.template_id
    where gs.organization_id = public.get_auth_organization_id()
      and gs.test_mode = false
      and (p_from_at is null or gs.created_at >= p_from_at)
    group by gs.template_id
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
    coalesce(su.session_count, 0)::bigint as session_count,
    coalesce(su.active_days, 0)::bigint as active_days,
    su.last_used_at,
    coalesce(du.assigned_devices, 0)::bigint as assigned_devices
  from frame_templates as ft
  left join session_usage as su on su.template_id = ft.id
  left join device_usage as du on du.template_id = ft.id
  order by session_count desc, ft.id;
$$;

revoke all on function public.get_frame_usage_insights(timestamptz) from public;
grant execute on function public.get_frame_usage_insights(timestamptz) to authenticated;
