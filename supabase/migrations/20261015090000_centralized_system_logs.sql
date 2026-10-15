create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  trace_id text,
  request_id text,
  level text not null default 'info' check (level in ('debug', 'info', 'warning', 'error', 'fatal')),
  service text not null default 'poskart-admin',
  module text,
  event_name text not null,
  message text not null,
  organization_id text references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_logs_created_at_idx on public.system_logs (created_at desc);
create index if not exists system_logs_trace_id_idx on public.system_logs (trace_id, created_at desc);
create index if not exists system_logs_request_id_idx on public.system_logs (request_id, created_at desc);
create index if not exists system_logs_event_name_idx on public.system_logs (event_name, created_at desc);
create index if not exists system_logs_organization_idx on public.system_logs (organization_id, created_at desc);

alter table public.system_logs enable row level security;

drop policy if exists "Super admins can view system logs" on public.system_logs;
create policy "Super admins can view system logs"
  on public.system_logs for select to authenticated
  using (public.is_auth_admin());

grant select on public.system_logs to authenticated;
