-- Move a frame between optional categories and persist its global display order
-- in one database operation. This keeps web drag-and-drop changes consistent.

create or replace function public.move_template_to_frame_category(
  target_template_id text,
  target_frame_category_id text,
  template_ids text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_organization_id text;
  matching_template_count integer;
begin
  if coalesce(array_length(template_ids, 1), 0) = 0 then
    raise exception 'Template order cannot be empty';
  end if;

  select organization_id
    into target_organization_id
  from public.templates
  where id = target_template_id;

  if target_organization_id is null then
    raise exception 'Template % was not found or cannot be moved', target_template_id;
  end if;

  if not target_template_id = any(template_ids) then
    raise exception 'Moved template must be included in the template order';
  end if;

  if target_frame_category_id is not null and not exists (
    select 1
    from public.frame_categories
    where id = target_frame_category_id
      and organization_id = target_organization_id
  ) then
    raise exception 'Frame category is unavailable for this organization';
  end if;

  select count(*)
    into matching_template_count
  from public.templates
  where organization_id = target_organization_id
    and id = any(template_ids);

  if matching_template_count <> array_length(template_ids, 1) then
    raise exception 'One or more templates cannot be reordered';
  end if;

  update public.templates
  set frame_category_id = target_frame_category_id,
      updated_at = now(),
      updated_at_label = 'just now'
  where id = target_template_id
    and organization_id = target_organization_id;

  update public.templates as template
  set display_order = ordered.position
  from (
    select template_id, ordinality::integer - 1 as position
    from unnest(template_ids) with ordinality as input(template_id, ordinality)
  ) as ordered
  where template.id = ordered.template_id
    and template.organization_id = target_organization_id;
end;
$$;

grant execute on function public.move_template_to_frame_category(text, text, text[]) to authenticated;
