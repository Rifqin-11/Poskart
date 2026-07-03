alter table public.payout_invoices
  add column if not exists payment_proof_url text,
  add column if not exists payment_proof_key text,
  add column if not exists payment_proof_uploaded_at timestamptz;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null default 'user'
    check (audience in ('user', 'organization', 'superadmin')),
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  organization_id text references public.organizations(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_notifications_target_check
    check (
      (audience = 'user' and recipient_profile_id is not null)
      or (audience = 'organization' and organization_id is not null)
      or (audience = 'superadmin')
    )
);

create index if not exists admin_notifications_recipient_idx
  on public.admin_notifications (recipient_profile_id, read_at, created_at desc);

create index if not exists admin_notifications_org_idx
  on public.admin_notifications (organization_id, read_at, created_at desc);

create index if not exists admin_notifications_superadmin_idx
  on public.admin_notifications (audience, read_at, created_at desc)
  where audience = 'superadmin';

revoke all on public.admin_notifications from anon;
grant select on public.admin_notifications to authenticated;
grant select, insert, update, delete on public.admin_notifications to service_role;

alter table public.admin_notifications enable row level security;

drop policy if exists "Users can view relevant admin notifications" on public.admin_notifications;
create policy "Users can view relevant admin notifications"
  on public.admin_notifications
  for select
  to authenticated
  using (
    recipient_profile_id = (select auth.uid())
    or (
      audience = 'organization'
      and organization_id in (
        select organization_id
        from public.organization_members
        where profile_id = (select auth.uid())
      )
    )
    or (
      audience = 'superadmin'
      and public.is_auth_admin()
    )
  );

drop policy if exists "Users can mark relevant admin notifications read" on public.admin_notifications;
create policy "Users can mark relevant admin notifications read"
  on public.admin_notifications
  for update
  to authenticated
  using (
    recipient_profile_id = (select auth.uid())
    or (
      audience = 'organization'
      and organization_id in (
        select organization_id
        from public.organization_members
        where profile_id = (select auth.uid())
      )
    )
    or (
      audience = 'superadmin'
      and public.is_auth_admin()
    )
  )
  with check (
    recipient_profile_id = (select auth.uid())
    or (
      audience = 'organization'
      and organization_id in (
        select organization_id
        from public.organization_members
        where profile_id = (select auth.uid())
      )
    )
    or (
      audience = 'superadmin'
      and public.is_auth_admin()
    )
  );

notify pgrst, 'reload schema';
