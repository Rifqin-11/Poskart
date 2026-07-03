alter table public.transactions
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists archive_reason text;

create index if not exists transactions_archived_at_idx
  on public.transactions (organization_id, archived_at);

create table if not exists public.transaction_action_requests (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null references public.transactions(id) on delete restrict,
  organization_id text not null references public.organizations(id) on delete cascade,
  action text not null check (action in ('verify', 'refund', 'archive')),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'canceled')),
  reason text,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  transaction_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transaction_action_requests_open_unique
  on public.transaction_action_requests (transaction_id, action)
  where status = 'requested';

create index if not exists transaction_action_requests_org_status_idx
  on public.transaction_action_requests (organization_id, status, requested_at desc);

grant select, insert, update on public.transaction_action_requests to authenticated;
grant select, insert, update, delete on public.transaction_action_requests to service_role;

alter table public.transaction_action_requests enable row level security;

drop policy if exists "View transaction action requests" on public.transaction_action_requests;
create policy "View transaction action requests"
  on public.transaction_action_requests
  for select
  to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );

drop policy if exists "Create transaction action requests" on public.transaction_action_requests;
create policy "Create transaction action requests"
  on public.transaction_action_requests
  for insert
  to authenticated
  with check (
    (
      public.is_auth_admin()
      or organization_id in (
        select organization_id
        from public.organization_members
        where profile_id = (select auth.uid())
      )
    )
    and requested_by = (select auth.uid())
    and status = 'requested'
  );

drop policy if exists "Review transaction action requests" on public.transaction_action_requests;
create policy "Review transaction action requests"
  on public.transaction_action_requests
  for update
  to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());
