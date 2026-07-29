-- A frame assignment belongs to a device and a template identity, never to a
-- mutable template name. The legacy devices.frame_templates array remains a
-- compatibility mirror containing template IDs while clients migrate.

create table if not exists public.device_frame_templates (
  device_id text not null references public.devices(id) on delete cascade,
  template_id text not null references public.templates(id) on delete restrict,
  organization_id text not null references public.organizations(id) on delete cascade,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  primary key (device_id, template_id)
);

create index if not exists device_frame_templates_device_order_idx
  on public.device_frame_templates (device_id, display_order);
create index if not exists device_frame_templates_organization_template_idx
  on public.device_frame_templates (organization_id, template_id);

alter table public.device_frame_templates enable row level security;

drop policy if exists "Manage device frame templates" on public.device_frame_templates;
create policy "Manage device frame templates" on public.device_frame_templates
  for all to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  )
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.device_frame_templates to authenticated;

create or replace function public.validate_device_frame_template_organization()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  device_organization_id text;
  template_organization_id text;
begin
  select organization_id into device_organization_id
  from public.devices
  where id = new.device_id;
  select organization_id into template_organization_id
  from public.templates
  where id = new.template_id;

  if device_organization_id is null
    or template_organization_id is null
    or new.organization_id <> device_organization_id
    or new.organization_id <> template_organization_id then
    raise exception 'Device frame assignment must belong to one organization';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_device_frame_template_organization
  on public.device_frame_templates;
create trigger validate_device_frame_template_organization
  before insert or update on public.device_frame_templates
  for each row execute function public.validate_device_frame_template_organization();

-- Convert all legacy assignments that can still be resolved by ID or current
-- name. An old name that was renamed before this migration is deliberately
-- left untouched so an admin can explicitly select the correct frame once.
with legacy_assignments as (
  select
    device.organization_id,
    device.id as device_id,
    assignment.value as legacy_value,
    assignment.ordinality::integer - 1 as display_order
  from public.devices as device
  cross join lateral unnest(
    case
      when coalesce(array_length(device.frame_templates, 1), 0) > 0
        then device.frame_templates
      when nullif(trim(coalesce(device.template, '')), '') is not null
        then array[device.template]
      else array[]::text[]
    end
  ) with ordinality as assignment(value, ordinality)
), matched_assignments as (
  select
    legacy.organization_id,
    legacy.device_id,
    template.id as template_id,
    min(legacy.display_order) as display_order
  from legacy_assignments as legacy
  join public.templates as template
    on template.organization_id = legacy.organization_id
   and (template.id = legacy.legacy_value or template.name = legacy.legacy_value)
  group by legacy.organization_id, legacy.device_id, template.id
)
insert into public.device_frame_templates (
  device_id,
  template_id,
  organization_id,
  display_order
)
select device_id, template_id, organization_id, display_order
from matched_assignments
on conflict (device_id, template_id) do update
  set display_order = excluded.display_order;

-- Keep the legacy mirror valid for all devices successfully backfilled.
update public.devices as device
set
  frame_templates = relation.template_ids,
  template = coalesce(relation.template_ids[1], ''),
  updated_at = now()
from (
  select
    device_id,
    array_agg(template_id order by display_order, template_id) as template_ids
  from public.device_frame_templates
  group by device_id
) as relation
where device.id = relation.device_id;

create or replace function public.set_device_frame_templates(
  target_device_id text,
  target_template_ids text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_organization_id text;
  matching_template_count integer;
  distinct_template_count integer;
begin
  select organization_id
    into target_organization_id
  from public.devices
  where id = target_device_id;

  if target_organization_id is null then
    raise exception 'Device % was not found or cannot be configured', target_device_id;
  end if;

  if not public.is_auth_admin() and not exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin', 'designer')
  ) then
    raise exception 'You are not allowed to configure this device';
  end if;

  select count(distinct template_id)
    into distinct_template_count
  from unnest(coalesce(target_template_ids, array[]::text[])) as input(template_id);

  select count(*)
    into matching_template_count
  from public.templates
  where organization_id = target_organization_id
    and category = 'frame'
    and id = any(coalesce(target_template_ids, array[]::text[]));

  if matching_template_count <> distinct_template_count then
    raise exception 'One or more frame templates are unavailable for this organization';
  end if;

  delete from public.device_frame_templates
  where device_id = target_device_id;

  insert into public.device_frame_templates (
    device_id,
    template_id,
    organization_id,
    display_order
  )
  select
    target_device_id,
    input.template_id,
    target_organization_id,
    min(input.ordinality)::integer - 1
  from unnest(coalesce(target_template_ids, array[]::text[]))
    with ordinality as input(template_id, ordinality)
  group by input.template_id;

  update public.devices
  set
    frame_templates = coalesce(target_template_ids, array[]::text[]),
    template = coalesce(target_template_ids[1], ''),
    updated_at = now()
  where id = target_device_id
    and organization_id = target_organization_id;
end;
$$;

grant execute on function public.set_device_frame_templates(text, text[]) to authenticated;
