-- Subscription promotions are independent of photobooth voucher campaigns.
create table public.subscription_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  description text not null default '',
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,40}$'),
  status text not null default 'draft' check (status in ('draft','published','paused','archived')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value integer not null check (discount_value > 0),
  discount_tiers jsonb not null default '[]'::jsonb,
  max_discount integer check (max_discount > 0),
  min_amount integer not null default 0 check (min_amount >= 0),
  plan_ids text[] not null default '{}',
  audience text not null default 'all' check (audience in ('all','new','existing')),
  usage_limit integer check (usage_limit > 0),
  per_organization_limit integer not null default 1 check (per_organization_limit > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create table public.subscription_campaign_audit (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.subscription_campaigns(id),
  actor_id uuid references auth.users(id) on delete set null,
  before_data jsonb,
  after_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.subscription_campaigns enable row level security;
alter table public.subscription_campaign_audit enable row level security;
-- Access is exclusively through authorized server actions / service_role.
revoke all on public.subscription_campaigns, public.subscription_campaign_audit from anon, authenticated;
grant all on public.subscription_campaigns, public.subscription_campaign_audit to service_role;

alter table public.subscription_orders
  add column campaign_id uuid references public.subscription_campaigns(id),
  add column promotion_code text,
  add column promotion_name text,
  add column discount_amount integer not null default 0 check (discount_amount >= 0);
create index subscription_orders_campaign_idx on public.subscription_orders(campaign_id, organization_id);

create function public.audit_subscription_campaign() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscription_campaign_audit(campaign_id, actor_id, before_data, after_data)
  values (new.id, new.updated_by,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
-- AFTER insert ensures the campaign foreign key exists.
create trigger subscription_campaign_audit after insert or update on public.subscription_campaigns
  for each row execute function public.audit_subscription_campaign();

create function public.validate_subscription_campaign_tiers() returns trigger
language plpgsql set search_path = public as $$
declare tier jsonb;
begin
  if jsonb_typeof(new.discount_tiers) <> 'array' or jsonb_array_length(new.discount_tiers) > 20 then
    raise exception 'Invalid discount tiers';
  end if;
  for tier in select * from jsonb_array_elements(new.discount_tiers) loop
    if jsonb_typeof(tier->'minAmount') is distinct from 'number'
      or jsonb_typeof(tier->'value') is distinct from 'number' then raise exception 'Invalid discount tier'; end if;
    if (tier->>'minAmount')::numeric < 0 or (tier->>'minAmount')::numeric > 2000000000
      or (tier->>'minAmount')::numeric <> trunc((tier->>'minAmount')::numeric)
      or (tier->>'value')::numeric < 1 or (tier->>'value')::numeric > 2000000000
      or (tier->>'value')::numeric <> trunc((tier->>'value')::numeric)
      or (new.discount_type = 'percentage' and (tier->>'value')::numeric > 100) then
      raise exception 'Invalid discount tier';
    end if;
  end loop;
  if (select count(*) <> count(distinct t->>'minAmount') from jsonb_array_elements(new.discount_tiers) t) then
    raise exception 'Duplicate discount tier threshold';
  end if;
  return new;
end;
$$;
create trigger validate_subscription_campaign_tiers before insert or update on public.subscription_campaigns
  for each row execute function public.validate_subscription_campaign_tiers();

create function public.quote_subscription_campaign(p_code text, p_organization_id text, p_plan_id text, p_amount integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.subscription_campaigns%rowtype;
  v_discount integer;
  v_total bigint;
  v_org_total bigint;
  v_existing boolean;
  v_value integer;
begin
  select * into c from public.subscription_campaigns where code = upper(trim(p_code));
  if not found or c.status <> 'published' or now() < c.starts_at or now() >= c.ends_at then
    raise exception 'Voucher tidak tersedia atau di luar periode promo.';
  end if;
  if p_amount is null or p_amount < 1 or p_organization_id is null then raise exception 'Checkout tidak valid.'; end if;
  if cardinality(c.plan_ids) > 0 and not (p_plan_id = any(c.plan_ids)) then
    raise exception 'Voucher tidak berlaku untuk paket ini.';
  end if;
  if p_amount < c.min_amount then raise exception 'Minimum pembelian voucher belum terpenuhi.'; end if;
  select exists(select 1 from public.subscription_orders where organization_id = p_organization_id and status = 'paid') into v_existing;
  if (c.audience = 'new' and v_existing) or (c.audience = 'existing' and not v_existing) then
    raise exception 'Voucher tidak berlaku untuk organisasi ini.';
  end if;
  -- Every issued invoice keeps its slot, even if cancelled/expired: gateways may
  -- deliver a late success. Never reassign an issued discount to another order.
  select count(*), count(*) filter (where organization_id = p_organization_id)
    into v_total, v_org_total from public.subscription_orders where campaign_id = c.id;
  if (c.usage_limit is not null and v_total >= c.usage_limit) or v_org_total >= c.per_organization_limit then
    raise exception 'Kuota voucher telah digunakan atau dipesan oleh invoice sebelumnya.';
  end if;
  select (t->>'value')::integer into v_value from jsonb_array_elements(c.discount_tiers) t
    where (t->>'minAmount')::integer <= p_amount order by (t->>'minAmount')::integer desc limit 1;
  v_value := coalesce(v_value, c.discount_value);
  v_discount := case when c.discount_type = 'percentage'
    then floor(p_amount::numeric * v_value / 100)::integer else v_value end;
  v_discount := least(v_discount, coalesce(c.max_discount, v_discount), p_amount - 1);
  if v_discount < 1 then raise exception 'Diskon tidak dapat diterapkan pada nominal ini.'; end if;
  return jsonb_build_object('campaignId', c.id, 'name', c.name, 'code', c.code,
    'discountAmount', v_discount, 'totalAmount', p_amount - v_discount);
end;
$$;

create function public.apply_subscription_campaign() returns trigger
language plpgsql security definer set search_path = public as $$
declare q jsonb;
begin
  if new.campaign_id is null then
    if new.discount_amount <> 0 or new.promotion_code is not null then raise exception 'Invalid promotion metadata'; end if;
    return new;
  end if;
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Promotion orders must be created through authenticated checkout.';
  end if;
  -- Lock the campaign before testing quota and inserting: concurrent tenants
  -- cannot both claim the final slot.
  perform 1 from public.subscription_campaigns where id = new.campaign_id for update;
  q := public.quote_subscription_campaign(new.promotion_code, new.organization_id, new.plan_id,
    new.base_amount + new.additional_device_amount);
  if (q->>'campaignId')::uuid <> new.campaign_id then raise exception 'Invalid campaign'; end if;
  if new.amount <> (q->>'totalAmount')::integer then
    raise exception 'Harga promo berubah. Terapkan ulang voucher sebelum membayar.';
  end if;
  new.promotion_name := q->>'name';
  new.promotion_code := q->>'code';
  new.discount_amount := (q->>'discountAmount')::integer;
  new.amount := (q->>'totalAmount')::integer;
  return new;
end;
$$;
create trigger apply_subscription_campaign before insert on public.subscription_orders
  for each row execute function public.apply_subscription_campaign();

revoke all on function public.quote_subscription_campaign(text,text,text,integer) from public, anon, authenticated;
grant execute on function public.quote_subscription_campaign(text,text,text,integer) to service_role;
revoke all on function public.apply_subscription_campaign(), public.audit_subscription_campaign() from public, anon, authenticated;
revoke all on function public.validate_subscription_campaign_tiers() from public, anon, authenticated;

-- Aggregate in Postgres rather than truncating analytics at the API row limit.
create function public.subscription_campaign_statistics()
returns table(campaign_id uuid, issued bigint, paid bigint, total_discount bigint)
language sql security definer set search_path = public as $$
  select campaign_id, count(*), count(*) filter (where status = 'paid'),
    coalesce(sum(discount_amount) filter (where status = 'paid'), 0)::bigint
  from public.subscription_orders where campaign_id is not null group by campaign_id;
$$;
revoke all on function public.subscription_campaign_statistics() from public, anon, authenticated;
grant execute on function public.subscription_campaign_statistics() to service_role;
