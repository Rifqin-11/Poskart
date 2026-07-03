-- Migration: Allow users to delete their own membership row (leave organization)
-- Adds a DELETE policy to public.organization_members so non-admin users (designer, akuntan, partner) can leave their workspace.

CREATE POLICY "Users can delete their own membership"
  ON public.organization_members FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
  );
