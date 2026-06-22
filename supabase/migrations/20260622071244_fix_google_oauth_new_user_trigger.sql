-- Fix Google OAuth signups failing with:
-- "Database error saving new user"
--
-- The onboarding flow requires new users to land on /onboarding and create or
-- join an organization there. A later theme migration reintroduced automatic
-- organization creation inside the auth.users trigger, but organizations now
-- require join_code. That made the auth transaction fail for new OAuth users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  platform_role text;
begin
  if new.email in ('rifqinaufal9009@gmail.com', 'admin@poskart.id', 'admin@poskart.my.id') then
    platform_role := 'admin';
  else
    platform_role := 'user';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, platform_role)
  on conflict (id) do update set
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.create_organization_for_current_user(org_name text)
returns table (organization_id text, join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  new_org_id text;
  new_join_code text;
  layout_id text;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(org_name), '') is null then
    raise exception 'Organization name is required';
  end if;

  if exists (
    select 1 from public.organization_members where profile_id = current_user_id
  ) then
    raise exception 'User already belongs to an organization';
  end if;

  select email into current_user_email
  from public.profiles
  where id = current_user_id;

  if current_user_email is null then
    select email into current_user_email
    from auth.users
    where id = current_user_id;

    insert into public.profiles (id, email, role)
    values (current_user_id, current_user_email, 'user')
    on conflict (id) do nothing;
  end if;

  new_org_id := 'org_' || replace(gen_random_uuid()::text, '-', '');
  new_join_code := public.generate_organization_join_code();

  insert into public.organizations (
    id,
    name,
    plan,
    status,
    booths,
    users,
    renewal_date,
    join_code
  ) values (
    new_org_id,
    trim(org_name),
    'Free',
    'active',
    0,
    1,
    current_date + 365,
    new_join_code
  );

  insert into public.subscriptions (
    organization_id,
    plan_id,
    status,
    device_limit
  ) values (
    new_org_id,
    'free',
    'free',
    1
  );

  insert into public.organization_members (organization_id, profile_id, role)
  values (new_org_id, current_user_id, 'owner');

  layout_id := 'default-minimalist-' || new_org_id;

  insert into public.layout_schemas (
    id,
    name,
    status,
    schema,
    organization_id
  ) values (
    layout_id,
    'Minimalist',
    'published',
    public.get_default_minimalist_schema(),
    new_org_id
  )
  on conflict (id) do update set
    name = excluded.name,
    status = excluded.status,
    schema = excluded.schema,
    organization_id = excluded.organization_id,
    updated_at = now();

  return query select new_org_id, new_join_code;
end;
$$;

grant execute on function public.create_organization_for_current_user(text) to authenticated;
