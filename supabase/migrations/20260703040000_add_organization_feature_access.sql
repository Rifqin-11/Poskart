alter table public.organizations
  add column if not exists features jsonb not null default '{}'::jsonb;

update public.organizations
set features = '{}'::jsonb
where features is null;
