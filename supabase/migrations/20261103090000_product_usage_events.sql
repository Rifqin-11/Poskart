-- First-party product usage analytics.
-- This table intentionally stores only a small allowlisted event envelope.
create table if not exists public.product_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id text references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (
    event_name in (
      'page_viewed',
      'signup_completed',
      'trial_started',
      'onboarding_completed',
      'device_pairing_started',
      'device_pairing_success',
      'device_pairing_failed',
      'pricing_viewed',
      'checkout_started',
      'first_transaction_created'
    )
  ),
  page_path text check (page_path is null or char_length(page_path) between 1 and 200),
  session_id text check (session_id is null or char_length(session_id) between 16 and 100),
  source text not null default 'admin'
    check (source in ('auth', 'admin', 'onboarding', 'billing', 'kiosk')),
  success boolean,
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_:-]{1,64}$'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
    check (octet_length(metadata::text) <= 2048),
  created_at timestamptz not null default now()
);

create index if not exists product_usage_events_created_at_idx
  on public.product_usage_events (created_at desc);
create index if not exists product_usage_events_event_name_idx
  on public.product_usage_events (event_name, created_at desc);
create index if not exists product_usage_events_organization_idx
  on public.product_usage_events (organization_id, created_at desc);
create index if not exists product_usage_events_page_idx
  on public.product_usage_events (page_path, created_at desc)
  where page_path is not null;
create unique index if not exists product_usage_events_first_transaction_idx
  on public.product_usage_events (organization_id)
  where event_name = 'first_transaction_created'
    and organization_id is not null;

create or replace function public.validate_product_usage_event_metadata()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  item record;
begin
  for item in select key, value from jsonb_each(new.metadata) loop
    if not (
      (new.event_name = 'page_viewed' and item.key in ('source'))
      or (new.event_name = 'signup_completed' and item.key in ('provider'))
      or (new.event_name = 'trial_started' and item.key in ('already_active'))
      or (new.event_name = 'onboarding_completed' and item.key in ('path'))
      or (new.event_name in ('device_pairing_started', 'device_pairing_success', 'device_pairing_failed')
        and item.key in ('surface'))
      or (new.event_name = 'pricing_viewed' and item.key in ('surface'))
      or (new.event_name = 'checkout_started' and item.key in ('plan_id', 'device_count'))
      or (new.event_name = 'first_transaction_created' and item.key in ('source'))
    ) then
      raise exception 'Product usage metadata key is not allowed: %', item.key;
    end if;

    if jsonb_typeof(item.value) not in ('string', 'number', 'boolean', 'null') then
      raise exception 'Product usage metadata values must be scalar';
    end if;

    if jsonb_typeof(item.value) = 'string'
      and char_length(item.value #>> '{}') > 120 then
      raise exception 'Product usage metadata string is too long';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validate_product_usage_event_metadata
  on public.product_usage_events;
create trigger validate_product_usage_event_metadata
  before insert or update on public.product_usage_events
  for each row execute function public.validate_product_usage_event_metadata();

-- Capture the first paid transaction regardless of whether it came from the
-- web POS or the kiosk API. The unique index makes this idempotent.
create or replace function public.record_first_transaction_product_usage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_source text;
begin
  if tg_table_name = 'transactions'
    and coalesce(to_jsonb(new)->>'status', '') <> 'paid' then
    return new;
  end if;

  if new.organization_id is null then
    return new;
  end if;

  event_source := case
    when tg_table_name = 'transactions'
      and coalesce(to_jsonb(new)->>'booth', '') <> 'Web Admin' then 'kiosk'
    else 'admin'
  end;

  insert into public.product_usage_events (
    organization_id,
    event_name,
    source,
    success,
    metadata
  ) values (
    new.organization_id,
    'first_transaction_created',
    event_source,
    true,
    jsonb_build_object(
      'source', event_source
    )
  ) on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists record_first_transaction_product_usage
  on public.transactions;
create trigger record_first_transaction_product_usage
  after insert or update of status on public.transactions
  for each row execute function public.record_first_transaction_product_usage();

drop trigger if exists record_first_pos_sale_product_usage
  on public.pos_sales;
create trigger record_first_pos_sale_product_usage
  after insert on public.pos_sales
  for each row execute function public.record_first_transaction_product_usage();

alter table public.product_usage_events enable row level security;

drop policy if exists "Authenticated users can record product usage" on public.product_usage_events;

drop policy if exists "Super admins can view product usage" on public.product_usage_events;
create policy "Super admins can view product usage"
  on public.product_usage_events for select to authenticated
  using (public.is_auth_admin());

revoke all on public.product_usage_events from public, anon;
revoke insert, update, delete on public.product_usage_events from authenticated;
grant select on public.product_usage_events to authenticated;
grant select, insert on public.product_usage_events to service_role;

create or replace function public.get_product_usage_analytics(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_auth_admin() then
    raise exception 'Unauthorized';
  end if;

  with filtered as (
    select
      event_name,
      organization_id,
      user_id,
      session_id,
      page_path,
      error_code
    from public.product_usage_events
    where created_at >= p_from
      and created_at < p_to
  ),
  page_rows as (
    select
      page_path,
      count(distinct organization_id)::integer as unique_organizations,
      count(*)::integer as total_views
    from filtered
    where event_name = 'page_viewed'
      and page_path is not null
      and organization_id is not null
    group by page_path
  ),
  pairing_error_rows as (
    select
      coalesce(error_code, 'UNKNOWN') as error_code,
      count(distinct organization_id)::integer as organizations,
      count(*)::integer as attempts
    from filtered
    where event_name = 'device_pairing_failed'
    group by coalesce(error_code, 'UNKNOWN')
  )
  select jsonb_build_object(
    'funnel', jsonb_build_object(
      'registered', (
        select count(distinct coalesce(user_id::text, session_id))::integer
        from filtered
        where event_name = 'signup_completed'
      ),
      'trial_started', (
        select count(distinct organization_id)::integer
        from filtered
        where event_name = 'trial_started'
          and organization_id is not null
      ),
      'onboarding_completed', (
        select count(distinct organization_id)::integer
        from filtered
        where event_name = 'onboarding_completed'
          and organization_id is not null
      ),
      'device_pairing_success', (
        select count(distinct organization_id)::integer
        from filtered
        where event_name = 'device_pairing_success'
          and organization_id is not null
      ),
      'checkout_started', (
        select count(distinct organization_id)::integer
        from filtered
        where event_name = 'checkout_started'
          and organization_id is not null
      ),
      'first_transaction_created', (
        select count(distinct organization_id)::integer
        from filtered
        where event_name = 'first_transaction_created'
          and organization_id is not null
      ),
      'active_organizations', (
        select count(*)::integer
        from (
          select organization_id
          from filtered
          where organization_id is not null
          group by organization_id
          having bool_or(event_name = 'device_pairing_success')
             and bool_or(event_name = 'first_transaction_created')
        ) activated
      )
    ),
    'page_usage', coalesce(
      (
        select jsonb_agg(to_jsonb(page_rows) order by total_views desc, page_path asc)
        from page_rows
      ),
      '[]'::jsonb
    ),
    'pairing_errors', coalesce(
      (
        select jsonb_agg(to_jsonb(pairing_error_rows) order by attempts desc, error_code asc)
        from pairing_error_rows
      ),
      '[]'::jsonb
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_product_usage_analytics(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_product_usage_analytics(timestamptz, timestamptz)
  to authenticated;

comment on table public.product_usage_events is
  'Minimal first-party product usage events. No passwords, OTPs, customer photos, bank details, or payment details.';
