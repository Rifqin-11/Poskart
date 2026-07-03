-- Migration: Fix ambiguous organization_id column reference in RLS policies for organization_join_requests

DROP POLICY IF EXISTS "Users can view their own join requests" ON public.organization_join_requests;
DROP POLICY IF EXISTS "Organization managers can manage join requests" ON public.organization_join_requests;

CREATE POLICY "Users can view their own join requests"
  ON public.organization_join_requests FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.organization_join_requests.organization_id IN (SELECT ids.organization_id FROM public.auth_manageable_organization_ids() as ids)
  );

CREATE POLICY "Organization managers can manage join requests"
  ON public.organization_join_requests FOR ALL TO authenticated
  USING (
    public.organization_join_requests.organization_id IN (SELECT ids.organization_id FROM public.auth_manageable_organization_ids() as ids)
  );
