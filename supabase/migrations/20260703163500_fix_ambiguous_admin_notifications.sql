-- Migration: Fix ambiguous organization_id column reference in RLS policies for admin_notifications

drop policy if exists "Users can view relevant admin notifications" on public.admin_notifications;
create policy "Users can view relevant admin notifications"
  on public.admin_notifications
  for select
  to authenticated
  using (
    public.admin_notifications.recipient_profile_id = (select auth.uid())
    or (
      public.admin_notifications.audience = 'organization'
      and public.admin_notifications.organization_id in (
        select om.organization_id
        from public.organization_members as om
        where om.profile_id = (select auth.uid())
      )
    )
    or (
      public.admin_notifications.audience = 'superadmin'
      and public.is_auth_admin()
    )
  );

drop policy if exists "Users can mark relevant admin notifications read" on public.admin_notifications;
create policy "Users can mark relevant admin notifications read"
  on public.admin_notifications
  for update
  to authenticated
  using (
    public.admin_notifications.recipient_profile_id = (select auth.uid())
    or (
      public.admin_notifications.audience = 'organization'
      and public.admin_notifications.organization_id in (
        select om.organization_id
        from public.organization_members as om
        where om.profile_id = (select auth.uid())
      )
    )
    or (
      public.admin_notifications.audience = 'superadmin'
      and public.is_auth_admin()
    )
  )
  with check (
    public.admin_notifications.recipient_profile_id = (select auth.uid())
    or (
      public.admin_notifications.audience = 'organization'
      and public.admin_notifications.organization_id in (
        select om.organization_id
        from public.organization_members as om
        where om.profile_id = (select auth.uid())
      )
    )
    or (
      public.admin_notifications.audience = 'superadmin'
      and public.is_auth_admin()
    )
  );

notify pgrst, 'reload schema';
