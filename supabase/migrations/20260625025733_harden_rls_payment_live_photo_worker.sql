-- Harden exposed public-schema tables, profile privileges, and Live Photo job
-- claiming. This migration intentionally keeps read paths needed by the kiosk
-- app while moving sensitive mutations away from direct browser/client grants.

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies
-- ---------------------------------------------------------------------------

create or replace function public.auth_organization_ids()
returns table (organization_id text)
language sql
security definer
stable
set search_path = public
as $$
  select om.organization_id
  from public.organization_members as om
  where om.profile_id = (select auth.uid());
$$;

create or replace function public.auth_manageable_organization_ids()
returns table (organization_id text)
language sql
security definer
stable
set search_path = public
as $$
  select om.organization_id
  from public.organization_members as om
  where om.profile_id = (select auth.uid())
    and om.role in ('owner', 'admin');
$$;

create or replace function public.get_auth_organization_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where profile_id = (select auth.uid())
  order by created_at asc
  limit 1;
$$;

create or replace function public.is_auth_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.auth_organization_ids() from public, anon;
revoke execute on function public.auth_manageable_organization_ids() from public, anon;
grant execute on function public.auth_organization_ids() to authenticated, service_role;
grant execute on function public.auth_manageable_organization_ids() to authenticated, service_role;

-- SECURITY DEFINER functions should not be callable by anonymous clients.
revoke execute on function public.get_auth_organization_id() from public, anon;
revoke execute on function public.is_auth_admin() from public, anon;
grant execute on function public.get_auth_organization_id() to authenticated, service_role;
grant execute on function public.is_auth_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Profiles: prevent client-side role/plan escalation
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Super admins can manage all profiles" on public.profiles;
drop policy if exists "View profiles in same tenant" on public.profiles;
drop policy if exists "Manage profiles" on public.profiles;
drop policy if exists "View profiles in same organization" on public.profiles;
drop policy if exists "Users can update own basic profile" on public.profiles;

create policy "View profiles in same organization"
  on public.profiles for select to authenticated
  using (
    public.is_auth_admin()
    or id = (select auth.uid())
    or id in (
      select om.profile_id
      from public.organization_members as om
      where om.organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
    )
  );

create policy "Users can update own basic profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (email, updated_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Organization membership/subscriptions/plans/app config RLS
-- ---------------------------------------------------------------------------

alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.app_configs enable row level security;

drop policy if exists "View organization members" on public.organization_members;
drop policy if exists "Manage organization members" on public.organization_members;
drop policy if exists "Organization members can view memberships" on public.organization_members;
drop policy if exists "Organization owners can manage memberships" on public.organization_members;

create policy "Organization members can view memberships"
  on public.organization_members for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

create policy "Organization owners can manage memberships"
  on public.organization_members for all to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  )
  with check (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_manageable_organization_ids() as ids)
  );

drop policy if exists "Organization members can view subscriptions" on public.subscriptions;
drop policy if exists "Platform admins can manage subscriptions" on public.subscriptions;

create policy "Organization members can view subscriptions"
  on public.subscriptions for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (select ids.organization_id from public.auth_organization_ids() as ids)
  );

create policy "Platform admins can manage subscriptions"
  on public.subscriptions for all to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

drop policy if exists "Public can read public subscription plans" on public.subscription_plans;
drop policy if exists "Authenticated users can manage subscription plans" on public.subscription_plans;
drop policy if exists "Authenticated users can read public subscription plans" on public.subscription_plans;
drop policy if exists "Platform admins can manage subscription plans" on public.subscription_plans;

create policy "Public can read public subscription plans"
  on public.subscription_plans for select to anon
  using (is_public = true);

create policy "Authenticated users can read public subscription plans"
  on public.subscription_plans for select to authenticated
  using (is_public = true or public.is_auth_admin());

create policy "Platform admins can manage subscription plans"
  on public.subscription_plans for all to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

drop policy if exists "Authenticated users can manage app_configs" on public.app_configs;
drop policy if exists "Public can read app_configs" on public.app_configs;
drop policy if exists "Authenticated users can read app_configs" on public.app_configs;
drop policy if exists "Platform admins can manage app_configs" on public.app_configs;

create policy "Public can read app_configs"
  on public.app_configs for select to anon
  using (true);

create policy "Authenticated users can read app_configs"
  on public.app_configs for select to authenticated
  using (true);

create policy "Platform admins can manage app_configs"
  on public.app_configs for all to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

revoke all on public.organization_members from anon;
grant select, insert, update, delete on public.organization_members to authenticated;

revoke all on public.subscriptions from anon;
grant select, insert, update, delete on public.subscriptions to authenticated;

grant select on public.subscription_plans to anon;
grant select, insert, update, delete on public.subscription_plans to authenticated;

grant select on public.app_configs to anon, authenticated;
revoke insert, update, delete on public.app_configs from authenticated;
grant insert, update, delete on public.app_configs to authenticated;

-- ---------------------------------------------------------------------------
-- Payment/order tables: stop direct client status tampering where possible.
-- Kiosk writes transactions via authenticated API routes and RLS still limits
-- rows to the current organization. Subscription order activation remains
-- callback/service-role driven.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read subscription_orders" on public.subscription_orders;
drop policy if exists "Public users can create subscription_orders" on public.subscription_orders;
drop policy if exists "Authenticated users can update subscription_orders" on public.subscription_orders;
drop policy if exists "Public can create subscription orders" on public.subscription_orders;
drop policy if exists "Users can read own subscription orders" on public.subscription_orders;
drop policy if exists "Platform admins can manage subscription orders" on public.subscription_orders;

create policy "Public can create subscription orders"
  on public.subscription_orders for insert to anon, authenticated
  with check (status = 'pending');

create policy "Platform admins can manage subscription orders"
  on public.subscription_orders for all to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

-- ---------------------------------------------------------------------------
-- Live Photo worker RPC: atomic claim + stale processing recovery
-- ---------------------------------------------------------------------------

alter table public.live_photo_render_jobs
  add column if not exists worker_id text;

create index if not exists live_photo_render_jobs_claim_idx
  on public.live_photo_render_jobs (status, attempts, created_at);

create index if not exists live_photo_render_jobs_device_id_idx
  on public.live_photo_render_jobs (device_id);

create or replace function public.claim_live_photo_render_job(
  max_attempts integer,
  lease_timeout_seconds integer default 900,
  worker_identifier text default null
)
returns setof public.live_photo_render_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate as (
    select id
    from public.live_photo_render_jobs
    where (
        status = 'queued'
        and attempts < max_attempts
      )
      or (
        status = 'processing'
        and attempts < max_attempts
        and started_at < now() - make_interval(secs => lease_timeout_seconds)
      )
    order by created_at asc
    for update skip locked
    limit 1
  )
  update public.live_photo_render_jobs as job
  set
    status = 'processing',
    attempts = job.attempts + 1,
    worker_id = worker_identifier,
    started_at = now(),
    completed_at = null,
    error_message = null,
    updated_at = now()
  from candidate
  where job.id = candidate.id
  returning job.*;
end;
$$;

revoke execute on function public.claim_live_photo_render_job(integer, integer, text) from public, anon, authenticated;
grant execute on function public.claim_live_photo_render_job(integer, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- FK indexes frequently used by RLS joins and dashboard queries
-- ---------------------------------------------------------------------------

create index if not exists devices_organization_id_idx on public.devices (organization_id);
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'owner_id'
  ) then
    create index if not exists organizations_owner_id_idx on public.organizations (owner_id);
  end if;
end;
$$;
create index if not exists theme_presets_organization_id_idx on public.theme_presets (organization_id);
create index if not exists assets_organization_id_idx on public.assets (organization_id);
create index if not exists layout_schemas_organization_id_idx on public.layout_schemas (organization_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index if not exists pos_sales_created_by_idx on public.pos_sales (created_by);
create index if not exists kiosk_oauth_tickets_user_id_idx on public.kiosk_oauth_tickets (user_id);
create index if not exists gallery_sessions_device_id_idx on public.gallery_sessions (device_id);
create index if not exists gallery_photos_organization_id_idx on public.gallery_photos (organization_id);
create index if not exists device_print_jobs_gallery_session_id_idx on public.device_print_jobs (gallery_session_id);
create index if not exists device_print_jobs_requested_by_idx on public.device_print_jobs (requested_by);
create index if not exists money_entries_created_by_idx on public.money_entries (created_by);
create index if not exists money_categories_created_by_idx on public.money_categories (created_by);
create index if not exists money_tags_created_by_idx on public.money_tags (created_by);
