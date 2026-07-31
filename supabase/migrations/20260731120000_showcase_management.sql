-- Dedicated, multi-showcase management for public frame and theme previews.

create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null default public.get_auth_organization_id()
    references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 600),
  public_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_token)
);

create index if not exists showcases_organization_updated_at_idx
  on public.showcases (organization_id, updated_at desc);

create table if not exists public.showcase_templates (
  showcase_id uuid not null references public.showcases(id) on delete cascade,
  template_id text not null references public.templates(id) on delete cascade,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  primary key (showcase_id, template_id)
);

create index if not exists showcase_templates_order_idx
  on public.showcase_templates (showcase_id, display_order);

create table if not exists public.showcase_themes (
  showcase_id uuid not null references public.showcases(id) on delete cascade,
  layout_schema_id text not null references public.layout_schemas(id) on delete cascade,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  primary key (showcase_id, layout_schema_id)
);

create index if not exists showcase_themes_order_idx
  on public.showcase_themes (showcase_id, display_order);

alter table public.showcases enable row level security;
alter table public.showcase_templates enable row level security;
alter table public.showcase_themes enable row level security;

drop policy if exists "Organization members can view showcases" on public.showcases;
create policy "Organization members can view showcases"
  on public.showcases for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

drop policy if exists "Showcase designers can manage showcases" on public.showcases;
create policy "Showcase designers can manage showcases"
  on public.showcases for all to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.organization_members
      where organization_id = showcases.organization_id
        and profile_id = auth.uid()
        and role in ('owner', 'admin', 'designer')
    )
  )
  with check (
    public.is_auth_admin()
    or exists (
      select 1
      from public.organization_members
      where organization_id = showcases.organization_id
        and profile_id = auth.uid()
        and role in ('owner', 'admin', 'designer')
    )
  );

drop policy if exists "Organization members can view showcase templates" on public.showcase_templates;
create policy "Organization members can view showcase templates"
  on public.showcase_templates for select to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.showcases
      join public.organization_members
        on organization_members.organization_id = showcases.organization_id
      where showcases.id = showcase_templates.showcase_id
        and organization_members.profile_id = auth.uid()
    )
  );

drop policy if exists "Showcase designers can manage showcase templates" on public.showcase_templates;
create policy "Showcase designers can manage showcase templates"
  on public.showcase_templates for all to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.showcases
      join public.organization_members
        on organization_members.organization_id = showcases.organization_id
      where showcases.id = showcase_templates.showcase_id
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
      where showcases.id = showcase_templates.showcase_id
        and organization_members.profile_id = auth.uid()
        and organization_members.role in ('owner', 'admin', 'designer')
    )
  );

drop policy if exists "Organization members can view showcase themes" on public.showcase_themes;
create policy "Organization members can view showcase themes"
  on public.showcase_themes for select to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.showcases
      join public.organization_members
        on organization_members.organization_id = showcases.organization_id
      where showcases.id = showcase_themes.showcase_id
        and organization_members.profile_id = auth.uid()
    )
  );

drop policy if exists "Showcase designers can manage showcase themes" on public.showcase_themes;
create policy "Showcase designers can manage showcase themes"
  on public.showcase_themes for all to authenticated
  using (
    public.is_auth_admin()
    or exists (
      select 1
      from public.showcases
      join public.organization_members
        on organization_members.organization_id = showcases.organization_id
      where showcases.id = showcase_themes.showcase_id
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
      where showcases.id = showcase_themes.showcase_id
        and organization_members.profile_id = auth.uid()
        and organization_members.role in ('owner', 'admin', 'designer')
    )
  );

grant select, insert, update, delete on public.showcases to authenticated;
grant select, insert, update, delete on public.showcase_templates to authenticated;
grant select, insert, update, delete on public.showcase_themes to authenticated;

create or replace function public.save_showcase(
  target_showcase_id uuid,
  target_name text,
  target_description text,
  target_template_ids text[],
  target_theme_ids text[]
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

  update public.showcases
  set updated_at = now()
  where id = saved_showcase_id;

  return saved_showcase_id;
end;
$$;

grant execute on function public.save_showcase(uuid, text, text, text[], text[])
  to authenticated;

-- Preserve the previous organization-level public link when that migration
-- has already been used, then carry its selected frames into a default entry.
insert into public.showcases (
  organization_id,
  name,
  description,
  public_token,
  created_at,
  updated_at
)
select
  organization.id,
  'Frame Showcase',
  'Pilihan frame untuk kolaborasi photobooth.',
  organization.showcase_public_token,
  now(),
  now()
from public.organizations as organization
where exists (
  select 1
  from public.templates as template
  where template.organization_id = organization.id
    and template.is_showcase = true
)
on conflict (public_token) do nothing;

insert into public.showcase_templates (showcase_id, template_id, display_order)
select
  showcase.id,
  template.id,
  row_number() over (
    partition by showcase.id
    order by template.display_order, template.updated_at desc
  )::integer - 1
from public.showcases as showcase
join public.organizations as organization
  on organization.id = showcase.organization_id
 and organization.showcase_public_token = showcase.public_token
join public.templates as template
  on template.organization_id = showcase.organization_id
 and template.is_showcase = true
 and template.status = 'published'
on conflict (showcase_id, template_id) do nothing;
