create table if not exists public.system_error_groups (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  fingerprint text not null unique,
  source text not null default 'web'
    check (source in ('web', 'server_action', 'route', 'render', 'proxy')),
  severity text not null default 'error'
    check (severity in ('warning', 'error', 'fatal')),
  message text not null,
  stack_trace text,
  context jsonb not null default '{}'::jsonb,
  route text,
  method text,
  error_type text,
  request_id text,
  digest text,
  occurrence_count integer not null default 1
    check (occurrence_count > 0),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_error_groups_open_idx
  on public.system_error_groups (last_seen desc)
  where resolved_at is null;

create index if not exists system_error_groups_source_seen_idx
  on public.system_error_groups (source, last_seen desc);

alter table public.system_error_groups enable row level security;

drop policy if exists "Super admins can view system errors"
  on public.system_error_groups;
create policy "Super admins can view system errors"
  on public.system_error_groups for select to authenticated
  using (public.is_auth_admin());

drop policy if exists "Super admins can update system errors"
  on public.system_error_groups;
create policy "Super admins can update system errors"
  on public.system_error_groups for update to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

grant select, update on public.system_error_groups to authenticated;
