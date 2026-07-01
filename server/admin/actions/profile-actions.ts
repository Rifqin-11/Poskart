"use server";

import { getAdminContext } from "@/server/admin/context";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  created_at: string;
  organization_members?: Array<{
    role: string | null;
    organization_id: string | null;
    organizations?:
      | {
          id: string;
          name: string | null;
        }
      | Array<{
          id: string;
          name: string | null;
        }>
      | null;
  }> | null;
};

export async function getProfiles() {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      role,
      created_at,
      organization_members (
        role,
        organization_id,
        organizations (
          id,
          name
        )
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as ProfileRow[]).map((profile) => {
    const memberInfo = profile.organization_members?.[0];
    const organization = Array.isArray(memberInfo?.organizations)
      ? memberInfo?.organizations[0]
      : memberInfo?.organizations;
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      created_at: profile.created_at,
      organizationId: memberInfo?.organization_id || null,
      organizationName: organization?.name || null,
      memberRole: memberInfo?.role || null,
    };
  });
}

export async function updateProfile({
  id,
  patch,
  organizationId,
}: {
  id: string;
  patch: Record<string, unknown>;
  organizationId?: string | null;
}) {
  const { supabase } = await getAdminContext();

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (organizationId !== undefined) {
    if (organizationId) {
      const { data: existing } = await supabase
        .from("organization_members")
        .select("id")
        .eq("profile_id", id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error: mErr } = await supabase
          .from("organization_members")
          .update({
            organization_id: organizationId,
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", id);
        if (mErr) throw mErr;
      } else {
        const { error: mErr } = await supabase
          .from("organization_members")
          .insert({
            organization_id: organizationId,
            profile_id: id,
            role: "staff",
          });
        if (mErr) throw mErr;
      }
    } else {
      const { error: mErr } = await supabase
        .from("organization_members")
        .delete()
        .eq("profile_id", id);
      if (mErr) throw mErr;
    }
  }

  return profile;
}

export async function deleteProfile(id: string) {
  const { supabase } = await getAdminContext();
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
  return true;
}
