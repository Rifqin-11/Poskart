-- Migration: Custom device limit on subscriptions table

-- 1. Add device_limit to subscriptions table
alter table public.subscriptions add column if not exists device_limit integer not null default 1;

-- 2. Populate device_limit from subscription_plans for existing records
update public.subscriptions s
set device_limit = p.max_devices
from public.subscription_plans p
where s.plan_id = p.id;

-- 3. Update trigger function to check subscriptions.device_limit directly
create or replace function public.check_device_limit()
returns trigger as $$
declare
  current_device_count integer;
  allowed_limit integer;
begin
  -- Get allowed limit directly from the active subscription
  select device_limit into allowed_limit
  from public.subscriptions
  where organization_id = new.organization_id
  limit 1;
  
  if allowed_limit is null then
    allowed_limit := 1;
  end if;
  
  -- Get current count
  select count(*) into current_device_count
  from public.devices
  where organization_id = new.organization_id;
  
  if current_device_count >= allowed_limit then
    raise exception 'Device limit exceeded! Your organization is limited to % device(s). Please upgrade your subscription plan.', allowed_limit;
  end if;
  
  return new;
end;
$$ language plpgsql;
