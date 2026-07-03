"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

export async function verifyRole(allowedRoles: ("owner" | "admin" | "designer" | "akuntan" | "partner")[]) {
  const { supabase, user } = await getAdminContext();

  const { data: member, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !member) {
    throw new Error("Unauthorized: Member not found in organization");
  }

  const role = member.role as "owner" | "admin" | "designer" | "akuntan" | "partner";
  if (!allowedRoles.includes(role)) {
    throw new Error(`Unauthorized: Insufficient permissions for role ${member.role}`);
  }

  return {
    supabase,
    user,
    role: member.role as "owner" | "admin" | "designer" | "akuntan" | "partner",
    organizationId: member.organization_id as string,
  };
}

