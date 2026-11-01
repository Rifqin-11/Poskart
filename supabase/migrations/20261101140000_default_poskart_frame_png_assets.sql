-- Use the supplied POSKART PNG assets in the default frames. Keep the
-- transparent regions aligned with editable photo slots in frame_layout.
create or replace function public.default_poskart_frame_layout(p_variant text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  asset_url text;
  asset_alt text;
  canvas_height integer := 1417;
  photo_slots jsonb;
begin
  case p_variant
    when 'border' then
      asset_url := 'https://assets.poskart.my.id/organizations/tnt_admin/builder/images/968f0cce-5b75-4c92-af98-ea5aeb9ef85f-transparent-3c82ad5e-fb1e-48fb-b659-6df07e3c16f8.png';
      asset_alt := 'POSKART Booth two-photo receipt frame';
      photo_slots := jsonb_build_array(
        jsonb_build_object(
          'id', 'photo-1', 'type', 'photo-slot',
          'x', 98, 'y', 230, 'width', 740, 'height', 395,
          'rotation', 0, 'opacity', 1, 'zIndex', 1, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 1', 'photoOrder', 1,
            'background', '#FFFFFF', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 0
          )
        ),
        jsonb_build_object(
          'id', 'photo-2', 'type', 'photo-slot',
          'x', 98, 'y', 645, 'width', 740, 'height', 396,
          'rotation', 0, 'opacity', 1, 'zIndex', 2, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 2', 'photoOrder', 2,
            'background', '#FFFFFF', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 0
          )
        )
      );
    when 'brand' then
      asset_url := 'https://assets.poskart.my.id/organizations/tnt_admin/builder/images/cd242a81-d73c-4357-93c5-76472e6bfa77-receipt.png';
      asset_alt := 'POSKART receipt frame';
      photo_slots := jsonb_build_array(
        jsonb_build_object(
          'id', 'photo-1', 'type', 'photo-slot',
          'x', 55, 'y', 116, 'width', 824, 'height', 823,
          'rotation', 0, 'opacity', 1, 'zIndex', 1, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 1', 'photoOrder', 1,
            'background', '#004AAD', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 0
          )
        )
      );
    when 'four' then
      asset_url := 'https://assets.poskart.my.id/organizations/tnt_admin/builder/images/bc499c75-0522-48ed-bedb-4c6b0e5fdd3f-transparent-v3-ff022f20-0806-4956-926a-5169814bd681.png';
      asset_alt := 'POSKART four-photo frame';
      canvas_height := 1299;
      photo_slots := jsonb_build_array(
        jsonb_build_object(
          'id', 'photo-1', 'type', 'photo-slot',
          'x', 45, 'y', 38, 'width', 415, 'height', 522,
          'rotation', 0, 'opacity', 1, 'zIndex', 1, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 1', 'photoOrder', 1,
            'background', '#FFFFFF', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 0
          )
        ),
        jsonb_build_object(
          'id', 'photo-2', 'type', 'photo-slot',
          'x', 482, 'y', 37, 'width', 415, 'height', 522,
          'rotation', 0, 'opacity', 1, 'zIndex', 2, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 2', 'photoOrder', 2,
            'background', '#FFFFFF', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 0
          )
        ),
        jsonb_build_object(
          'id', 'photo-3', 'type', 'photo-slot',
          'x', 45, 'y', 583, 'width', 415, 'height', 522,
          'rotation', 0, 'opacity', 1, 'zIndex', 3, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 3', 'photoOrder', 3,
            'background', '#FFFFFF', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 0
          )
        ),
        jsonb_build_object(
          'id', 'photo-4', 'type', 'photo-slot',
          'x', 482, 'y', 583, 'width', 415, 'height', 522,
          'rotation', 0, 'opacity', 1, 'zIndex', 4, 'locked', false,
          'props', jsonb_build_object(
            'label', 'Photo 4', 'photoOrder', 4,
            'background', '#FFFFFF', 'borderColor', 'transparent',
            'borderWidth', 0, 'radius', 0
          )
        )
      );
    else
      return jsonb_build_object(
        'version', 1,
        'canvas', jsonb_build_object(
          'width', 945, 'height', 1417, 'backgroundColor', '#FFFFFF'
        ),
        'nodes', '[]'::jsonb
      );
  end case;

  return jsonb_build_object(
    'version', 1,
    'canvas', jsonb_build_object(
      'width', 945,
      'height', canvas_height,
      'backgroundColor', '#FFFFFF'
    ),
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'frame-background', 'type', 'background',
        'x', 0, 'y', 0, 'width', 945, 'height', canvas_height,
        'rotation', 0, 'opacity', 1, 'zIndex', 0, 'locked', true,
        'props', jsonb_build_object(
          'src', asset_url, 'alt', asset_alt,
          'objectFit', 'cover', 'radius', 0
        )
      )
    ) || photo_slots
  );
end;
$$;

revoke all on function public.default_poskart_frame_layout(text)
  from public, anon, authenticated, service_role;

-- Future organizations use the same supplied assets. Existing seed markers
-- remain untouched, so deleted defaults are not recreated.
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
    frame_image_url,
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
    layout.frame_layout #>> '{nodes,0,props,src}',
    layout.frame_layout,
    true,
    150,
    template_order.next_order + frames.order_offset
  from (
    values
      ('border', 'Poskart with border', 'Classic POSKART border', 2, '#C4121A', 0),
      ('brand', 'Poskart Frame', 'POSKART branded frame', 1, '#00357B', 1),
      ('four', 'Poskart 4', 'Four-photo POSKART frame', 4, '#C4121A', 2)
  ) as frames(slug, name, tagline, photo_count, accent_color, order_offset)
  cross join lateral (
    select public.default_poskart_frame_layout(frames.slug) as frame_layout
  ) as layout
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

-- Replace only untouched seed rows. An edited or deleted frame is preserved.
with frame_specs as (
  select *
  from (values
    ('border', 'Poskart with border', 2),
    ('brand', 'Poskart Frame', 1),
    ('four', 'Poskart 4', 4)
  ) as specs(slug, name, photo_count)
), frame_layouts as (
  select
    specs.slug,
    specs.name,
    specs.photo_count,
    public.default_poskart_frame_layout(specs.slug) as frame_layout
  from frame_specs as specs
)
update public.templates as template
set
  frame_image_url = frame_layouts.frame_layout #>> '{nodes,0,props,src}',
  frame_layout = frame_layouts.frame_layout,
  photo_count = frame_layouts.photo_count,
  updated_at_label = 'Default frame',
  updated_at = now()
from frame_layouts
where template.id =
    'TPL-POSKART-' || md5(template.organization_id) || '-' || frame_layouts.slug
  and template.organization_id is not null
  and template.name = frame_layouts.name
  and template.category = 'frame'
  and template.is_default = true
  and template.frame_image_url is null
  and template.updated_at = template.created_at;
