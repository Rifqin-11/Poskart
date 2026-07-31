-- Let each showcase include uploaded images grouped under custom categories.

create table if not exists public.showcase_custom_items (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.showcases(id) on delete cascade,
  category text not null check (char_length(trim(category)) between 1 and 60),
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 400),
  image_url text not null check (char_length(image_url) between 1 and 2048),
  storage_path text not null check (char_length(storage_path) between 1 and 1024),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists showcase_custom_items_order_idx
  on public.showcase_custom_items (showcase_id, display_order);

alter table public.showcase_custom_items enable row level security;

drop policy if exists "Organization members can view showcase custom items"
  on public.showcase_custom_items;
create policy "Organization members can view showcase custom items"
  on public.showcase_custom_items for select to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.showcases
      join public.organization_members
        on organization_members.organization_id = showcases.organization_id
      where showcases.id = showcase_custom_items.showcase_id
        and organization_members.profile_id = auth.uid()
    )
  );

drop policy if exists "Showcase designers can manage custom items"
  on public.showcase_custom_items;
create policy "Showcase designers can manage custom items"
  on public.showcase_custom_items for all to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.showcases
      join public.organization_members
        on organization_members.organization_id = showcases.organization_id
      where showcases.id = showcase_custom_items.showcase_id
        and organization_members.profile_id = auth.uid()
        and organization_members.role in ('owner', 'admin', 'designer')
    )
  )
  with check (
    public.is_auth_admin()
    or exists (
      select 1
      from public.showcases
      join public.organization_members
        on organization_members.organization_id = showcases.organization_id
      where showcases.id = showcase_custom_items.showcase_id
        and organization_members.profile_id = auth.uid()
        and organization_members.role in ('owner', 'admin', 'designer')
    )
  );

grant select, insert, update, delete on public.showcase_custom_items to authenticated;

create or replace function public.save_showcase(
  target_showcase_id uuid,
  target_name text,
  target_description text,
  target_template_ids text[],
  target_theme_ids text[],
  target_custom_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_organization_id text;
  saved_showcase_id uuid;
  expected_count integer;
  matching_count integer;
  normalized_custom_items jsonb := coalesce(target_custom_items, '[]'::jsonb);
begin
  target_organization_id := public.get_auth_organization_id();

  if target_organization_id is null then
    raise exception 'Organization membership was not found';
  end if;

  if not public.is_auth_admin() and not exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin', 'designer')
  ) then
    raise exception 'You are not allowed to manage showcases';
  end if;

  if char_length(trim(coalesce(target_name, ''))) not between 1 and 100 then
    raise exception 'Showcase name must contain 1 to 100 characters';
  end if;

  if char_length(coalesce(target_description, '')) > 600 then
    raise exception 'Showcase description cannot exceed 600 characters';
  end if;

  select count(*) into expected_count
  from unnest(coalesce(target_template_ids, array[]::text[])) as item(id);
  if expected_count <> (
    select count(distinct id)
    from unnest(coalesce(target_template_ids, array[]::text[])) as item(id)
  ) then
    raise exception 'Duplicate frame selections are not allowed';
  end if;

  select count(*) into matching_count
  from public.templates
  where organization_id = target_organization_id
    and category = 'frame'
    and status = 'published'
    and id = any(coalesce(target_template_ids, array[]::text[]));
  if matching_count <> expected_count then
    raise exception 'One or more published frame templates are unavailable';
  end if;

  select count(*) into expected_count
  from unnest(coalesce(target_theme_ids, array[]::text[])) as item(id);
  if expected_count <> (
    select count(distinct id)
    from unnest(coalesce(target_theme_ids, array[]::text[])) as item(id)
  ) then
    raise exception 'Duplicate theme selections are not allowed';
  end if;

  select count(*) into matching_count
  from public.layout_schemas
  where organization_id = target_organization_id
    and id = any(coalesce(target_theme_ids, array[]::text[]));
  if matching_count <> expected_count then
    raise exception 'One or more themes are unavailable';
  end if;

  if jsonb_typeof(normalized_custom_items) <> 'array' then
    raise exception 'Custom showcase items must be an array';
  end if;

  if jsonb_array_length(normalized_custom_items) > 40 then
    raise exception 'A showcase can contain up to 40 custom items';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_custom_items) as item(value)
    where char_length(trim(coalesce(item.value ->> 'category', ''))) not between 1 and 60
      or char_length(trim(coalesce(item.value ->> 'title', ''))) not between 1 and 120
      or char_length(coalesce(item.value ->> 'description', '')) > 400
      or char_length(trim(coalesce(item.value ->> 'imageUrl', ''))) not between 1 and 2048
      or char_length(trim(coalesce(item.value ->> 'storagePath', ''))) not between 1 and 1024
      or (item.value ->> 'storagePath') not like
        ('organizations/' || target_organization_id || '/showcases/%')
  ) then
    raise exception 'One or more custom showcase items are invalid';
  end if;

  if target_showcase_id is null then
    insert into public.showcases (organization_id, name, description)
    values (
      target_organization_id,
      trim(target_name),
      nullif(trim(coalesce(target_description, '')), '')
    )
    returning id into saved_showcase_id;
  else
    update public.showcases
    set
      name = trim(target_name),
      description = nullif(trim(coalesce(target_description, '')), ''),
      updated_at = now()
    where id = target_showcase_id
      and organization_id = target_organization_id
    returning id into saved_showcase_id;

    if saved_showcase_id is null then
      raise exception 'Showcase was not found';
    end if;
  end if;

  delete from public.showcase_templates where showcase_id = saved_showcase_id;
  insert into public.showcase_templates (showcase_id, template_id, display_order)
  select saved_showcase_id, item.id, item.ordinality::integer - 1
  from unnest(coalesce(target_template_ids, array[]::text[]))
    with ordinality as item(id, ordinality);

  delete from public.showcase_themes where showcase_id = saved_showcase_id;
  insert into public.showcase_themes (showcase_id, layout_schema_id, display_order)
  select saved_showcase_id, item.id, item.ordinality::integer - 1
  from unnest(coalesce(target_theme_ids, array[]::text[]))
    with ordinality as item(id, ordinality);

  delete from public.showcase_custom_items where showcase_id = saved_showcase_id;
  insert into public.showcase_custom_items (
    showcase_id,
    category,
    title,
    description,
    image_url,
    storage_path,
    display_order
  )
  select
    saved_showcase_id,
    trim(item.value ->> 'category'),
    trim(item.value ->> 'title'),
    nullif(trim(coalesce(item.value ->> 'description', '')), ''),
    trim(item.value ->> 'imageUrl'),
    trim(item.value ->> 'storagePath'),
    item.ordinality::integer - 1
  from jsonb_array_elements(normalized_custom_items)
    with ordinality as item(value, ordinality);

  update public.showcases
  set updated_at = now()
  where id = saved_showcase_id;

  return saved_showcase_id;
end;
$$;

grant execute on function public.save_showcase(
  uuid,
  text,
  text,
  text[],
  text[],
  jsonb
) to authenticated;
