drop policy if exists "View profiles in same organization" on public.profiles;

create policy "View profiles in same organization"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_auth_admin()
  or exists (
    select 1
    from public.organization_members viewer_membership
    join public.organization_members target_membership
      on target_membership.organization_id = viewer_membership.organization_id
    where viewer_membership.profile_id = auth.uid()
      and target_membership.profile_id = public.profiles.id
  )
);
