-- Migration: Add profiles and RBAC support
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  plan_id text not null default 'free' check (plan_id in ('free', 'monthly', 'quarterly', 'yearly')),
  subscription_status text not null default 'free' check (subscription_status in ('free', 'active', 'expired')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Turn on RLS
alter table public.profiles enable row level security;

-- Drop policies if exists
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Super admins can manage all profiles" on public.profiles;

-- Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Super admins can manage all profiles"
  on public.profiles for all to authenticated
  using (true) with check (true);

-- Trigger to sync new auth users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, plan_id, subscription_status)
  values (
    new.id,
    new.email,
    case when new.email in ('rifqinaufal9009@gmail.com', 'admin@poskart.id', 'admin@poskart.my.id') then 'admin' else 'user' end,
    'free',
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Populate existing users
insert into public.profiles (id, email, role, plan_id, subscription_status)
select 
  id, 
  email, 
  case when email in ('rifqinaufal9009@gmail.com', 'admin@poskart.id', 'admin@poskart.my.id') then 'admin' else 'user' end, 
  'free', 
  'free'
from auth.users
on conflict (id) do nothing;

-- Grant permissions
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
