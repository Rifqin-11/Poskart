-- Persist the frame-category order used by the admin sections and Flutter tabs.

create or replace function public.reorder_frame_categories(category_ids text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_organization_id text;
  matching_category_count integer;
begin
  if coalesce(array_length(category_ids, 1), 0) = 0 then
    return;
  end if;

  select organization_id
    into target_organization_id
  from public.frame_categories
  where id = category_ids[1];

  if target_organization_id is null then
    raise exception 'Frame category % was not found or cannot be reordered', category_ids[1];
  end if;

  select count(*)
    into matching_category_count
  from public.frame_categories
  where organization_id = target_organization_id
    and id = any(category_ids);

  if matching_category_count <> array_length(category_ids, 1) then
    raise exception 'One or more frame categories cannot be reordered';
  end if;

  update public.frame_categories as category
  set display_order = ordered.position,
      updated_at = now()
  from (
    select category_id, ordinality::integer - 1 as position
    from unnest(category_ids) with ordinality as input(category_id, ordinality)
  ) as ordered
  where category.id = ordered.category_id
    and category.organization_id = target_organization_id;
end;
$$;

grant execute on function public.reorder_frame_categories(text[]) to authenticated;
