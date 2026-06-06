create policy "Organization members can delete POS sales"
  on public.pos_sales
  for delete
  to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = (select auth.uid())
    )
  );
