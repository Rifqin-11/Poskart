-- Migration: Tenant subscription management and device limit check

-- Add columns to tenants table
alter table public.tenants add column if not exists plan_id text not null default 'free';
alter table public.tenants add column if not exists subscription_status text not null default 'free';
alter table public.tenants add column if not exists subscription_expires_at timestamptz;
alter table public.tenants add column if not exists device_limit integer not null default 1;

-- Sync existing profiles subscription info to their tenants
do $$
declare
  p record;
begin
  for p in select tenant_id, plan_id, subscription_status, subscription_expires_at from public.profiles where tenant_id is not null loop
    update public.tenants 
    set 
      plan_id = p.plan_id,
      subscription_status = p.subscription_status,
      subscription_expires_at = p.subscription_expires_at,
      device_limit = case when p.plan_id = 'free' then 1 else 3 end -- default free to 1 device, Pro to 3 devices
    where id = p.tenant_id;
  end loop;
end;
$$;

-- Clean up plan details from profiles since it is now tenant-level
alter table public.profiles drop column if exists plan_id;
alter table public.profiles drop column if exists subscription_status;
alter table public.profiles drop column if exists subscription_expires_at;

-- Create trigger function to enforce device limit before inserting a booth
create or replace function public.check_booth_device_limit()
returns trigger as $$
declare
  current_booth_count integer;
  allowed_limit integer;
begin
  -- Get tenant allowed device limit
  select device_limit into allowed_limit
  from public.tenants
  where id = new.tenant_id;
  
  -- Fallback if no limit set
  if allowed_limit is null then
    allowed_limit := 1;
  end if;
  
  -- Get current count of booths for this tenant
  select count(*) into current_booth_count
  from public.booths
  where tenant_id = new.tenant_id;
  
  if current_booth_count >= allowed_limit then
    raise exception 'Device limit exceeded! Your organization is limited to % device(s). Please upgrade your subscription plan.', allowed_limit;
  end if;
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_booth_device_limit on public.booths;
create trigger enforce_booth_device_limit
  before insert on public.booths
  for each row execute procedure public.check_booth_device_limit();
