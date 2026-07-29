create table if not exists public.subscription_expiry_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references public.organizations(id) on delete cascade,
  recipient_profile_id uuid not null
    references public.profiles(id) on delete cascade,
  current_period_end timestamptz not null,
  days_before integer not null check (days_before in (7, 3, 1)),
  notification_sent_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    organization_id,
    recipient_profile_id,
    current_period_end,
    days_before
  )
);

create index if not exists subscription_expiry_reminders_retry_idx
  on public.subscription_expiry_reminders (current_period_end, email_sent_at)
  where email_sent_at is null;

revoke all on public.subscription_expiry_reminders from anon, authenticated;
grant select, insert, update, delete on public.subscription_expiry_reminders to service_role;

alter table public.subscription_expiry_reminders enable row level security;
