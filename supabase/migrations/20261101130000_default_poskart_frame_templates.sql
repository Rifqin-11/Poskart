-- Seed three editable, organization-owned starter frames exactly once. A
-- separate marker survives frame deletion so later organization updates never
-- recreate a frame that an admin intentionally removed.
create table if not exists public.organization_default_frame_seeds (
  organization_id text primary key
    references public.organizations(id) on delete cascade,
  seeded_at timestamptz not null default now()
);

alter table public.organization_default_frame_seeds enable row level security;
revoke all on public.organization_default_frame_seeds
  from public, anon, authenticated, service_role;

create or replace function public.default_poskart_frame_layout(p_variant text)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'version', 1,
    'canvas', jsonb_build_object(
      'width', 420,
      'height', 630,
      'backgroundColor', '#FAF8F2'
    ),
    'nodes', case p_variant
      when 'border' then jsonb_build_array(
        jsonb_build_object(
          'id', 'photo-1', 'type', 'photo-slot',
          'x', 32, 'y', 32, 'width', 356, 'height', 566,
          'rotation', 0, 'opacity', 1, 'zIndex', 1, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 1', 'photoOrder', 1,
            'background', '#F4F4F5', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 4
          )
        ),
        jsonb_build_object(
          'id', 'outer-border', 'type', 'border',
          'x', 12, 'y', 12, 'width', 396, 'height', 606,
          'rotation', 0, 'opacity', 1, 'zIndex', 2, 'locked', false,
          'props', jsonb_build_object(
            'borderColor', '#C4121A', 'borderWidth', 6, 'radius', 18
          )
        )
      )
      when 'brand' then jsonb_build_array(
        jsonb_build_object(
          'id', 'photo-1', 'type', 'photo-slot',
          'x', 26, 'y', 24, 'width', 368, 'height', 510,
          'rotation', 0, 'opacity', 1, 'zIndex', 1, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 1', 'photoOrder', 1,
            'background', '#F4F4F5', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 8
          )
        ),
        jsonb_build_object(
          'id', 'outer-border', 'type', 'border',
          'x', 12, 'y', 12, 'width', 396, 'height', 606,
          'rotation', 0, 'opacity', 1, 'zIndex', 2, 'locked', false,
          'props', jsonb_build_object(
            'borderColor', '#00357B', 'borderWidth', 3, 'radius', 18
          )
        ),
        jsonb_build_object(
          'id', 'brand-name', 'type', 'text',
          'x', 150, 'y', 558, 'width', 120, 'height', 34,
          'rotation', 0, 'opacity', 1, 'zIndex', 3, 'locked', false,
          'props', jsonb_build_object(
            'content', 'POSKART', 'color', '#00357B',
            'fontSize', 24, 'fontWeight', 700
          )
        )
      )
      when 'four' then jsonb_build_array(
        jsonb_build_object(
          'id', 'photo-1', 'type', 'photo-slot',
          'x', 24, 'y', 30, 'width', 178, 'height', 254,
          'rotation', 0, 'opacity', 1, 'zIndex', 1, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 1', 'photoOrder', 1,
            'background', '#F4F4F5', 'borderColor', '#E4E4E7',
            'borderWidth', 1, 'radius', 6
          )
        ),
        jsonb_build_object(
          'id', 'photo-2', 'type', 'photo-slot',
          'x', 218, 'y', 30, 'width', 178, 'height', 254,
          'rotation', 0, 'opacity', 1, 'zIndex', 2, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 2', 'photoOrder', 2,
            'background', '#F4F4F5', 'borderColor', '#E4E4E7',
            'borderWidth', 1, 'radius', 6
          )
        ),
        jsonb_build_object(
          'id', 'photo-3', 'type', 'photo-slot',
          'x', 24, 'y', 306, 'width', 178, 'height', 254,
          'rotation', 0, 'opacity', 1, 'zIndex', 3, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 3', 'photoOrder', 3,
            'background', '#F4F4F5', 'borderColor', '#E4E4E7',
            'borderWidth', 1, 'radius', 6
          )
        ),
        jsonb_build_object(
          'id', 'photo-4', 'type', 'photo-slot',
          'x', 218, 'y', 306, 'width', 178, 'height', 254,
          'rotation', 0, 'opacity', 1, 'zIndex', 4, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 4', 'photoOrder', 4,
            'background', '#F4F4F5', 'borderColor', '#E4E4E7',
            'borderWidth', 1, 'radius', 6
          )
        ),
        jsonb_build_object(
          'id', 'outer-border', 'type', 'border',
          'x', 12, 'y', 12, 'width', 396, 'height', 606,
          'rotation', 0, 'opacity', 1, 'zIndex', 5, 'locked', false,
          'props', jsonb_build_object(
            'borderColor', '#C4121A', 'borderWidth', 4, 'radius', 14
          )
        ),
        jsonb_build_object(
          'id', 'brand-name', 'type', 'text',
          'x', 150, 'y', 578, 'width', 120, 'height', 26,
          'rotation', 0, 'opacity', 1, 'zIndex', 6, 'locked', false,
          'props', jsonb_build_object(
            'content', 'POSKART 4', 'color', '#00357B',
            'fontSize', 16, 'fontWeight', 700
          )
        )
      )
      else '[]'::jsonb
    end
  );
$$;

revoke all on function public.default_poskart_frame_layout(text)
  from public, anon, authenticated, service_role;

create or replace function public.seed_poskart_default_frames(
  p_organization_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_default_frame_seeds (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  if not found then
    return;
  end if;

  insert into public.templates (
    id,
    organization_id,
    name,
    category,
    status,
    assigned_booths,
    updated_at_label,
    created_at,
    updated_at,
    tagline,
    photo_count,
    accent_color,
    frame_layout,
    is_default,
    print_length_mm,
    display_order
  )
  select
    'TPL-POSKART-' || md5(p_organization_id) || '-' || frames.slug,
    p_organization_id,
    frames.name,
    'frame',
    'published',
    0,
    'Default frame',
    now(),
    now(),
    frames.tagline,
    frames.photo_count,
    frames.accent_color,
    public.default_poskart_frame_layout(frames.slug),
    true,
    150,
    template_order.next_order + frames.order_offset
  from (
    values
      ('border', 'Poskart with border', 'Classic POSKART border', 1, '#C4121A', 0),
      ('brand', 'Poskart Frame', 'POSKART branded frame', 1, '#00357B', 1),
      ('four', 'Poskart 4', 'Four-photo POSKART frame', 4, '#C4121A', 2)
  ) as frames(slug, name, tagline, photo_count, accent_color, order_offset)
  cross join lateral (
    select coalesce(max(display_order), -1) + 1 as next_order
    from public.templates
    where organization_id = p_organization_id
  ) as template_order
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.seed_poskart_default_frames(text)
  from public, anon, authenticated, service_role;

create or replace function public.seed_poskart_default_frames_for_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_poskart_default_frames(new.id);
  return new;
end;
$$;

revoke all on function public.seed_poskart_default_frames_for_new_organization()
  from public, anon, authenticated, service_role;

drop trigger if exists seed_poskart_default_frames_after_organization_insert
  on public.organizations;
create trigger seed_poskart_default_frames_after_organization_insert
  after insert on public.organizations
  for each row execute function public.seed_poskart_default_frames_for_new_organization();

-- Existing organizations are backfilled once; the seed marker intentionally
-- remains after an admin deletes any of these templates.
do $$
declare
  organization_record record;
begin
  for organization_record in
    select id from public.organizations
  loop
    perform public.seed_poskart_default_frames(organization_record.id);
  end loop;
end;
$$;

-- Every newly inserted device receives its explicitly supplied frame IDs, or
-- the currently available default frames when none were supplied. Deleting a
-- template removes it from this query naturally; this trigger never seeds it.
create or replace function public.assign_default_frames_to_new_device()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_template_ids text[];
begin
  select coalesce(array_agg(available.id order by requested.first_order), '{}'::text[])
    into assigned_template_ids
  from (
    select input.template_id, min(input.ordinality)::integer as first_order
    from unnest(coalesce(new.frame_templates, '{}'::text[]))
      with ordinality as input(template_id, ordinality)
    group by input.template_id
  ) as requested
  join public.templates as available
    on available.id = requested.template_id
   and available.organization_id = new.organization_id
   and available.category = 'frame';

  if coalesce(cardinality(assigned_template_ids), 0) = 0
    and nullif(trim(coalesce(new.template, '')), '') is not null then
    select array[available.id]
      into assigned_template_ids
    from public.templates as available
    where available.id = trim(new.template)
      and available.organization_id = new.organization_id
      and available.category = 'frame'
    limit 1;
  end if;

  if coalesce(cardinality(assigned_template_ids), 0) = 0 then
    select coalesce(
      array_agg(available.id order by available.display_order, available.id),
      '{}'::text[]
    )
      into assigned_template_ids
    from public.templates as available
    where available.organization_id = new.organization_id
      and available.category = 'frame'
      and available.is_default = true;
  end if;

  if coalesce(cardinality(assigned_template_ids), 0) = 0 then
    return new;
  end if;

  insert into public.device_frame_templates (
    device_id,
    template_id,
    organization_id,
    display_order
  )
  select
    new.id,
    assigned.template_id,
    new.organization_id,
    assigned.ordinality::integer - 1
  from unnest(assigned_template_ids) with ordinality
    as assigned(template_id, ordinality)
  on conflict (device_id, template_id) do update
    set display_order = excluded.display_order;

  update public.devices
  set
    frame_templates = assigned_template_ids,
    template = assigned_template_ids[1],
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;

revoke all on function public.assign_default_frames_to_new_device()
  from public, anon, authenticated, service_role;

drop trigger if exists assign_default_frames_after_device_insert
  on public.devices;
create trigger assign_default_frames_after_device_insert
  after insert on public.devices
  for each row execute function public.assign_default_frames_to_new_device();
