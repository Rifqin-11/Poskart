"use server";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export type OrganizationRole =
  | "owner"
  | "admin"
  | "designer"
  | "akuntan"
  | "partner";

const getCachedAdminContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
});

export async function getAdminContext() {
  return getCachedAdminContext();
}

const getCachedAdminMembership = cache(async () => {
  const { supabase, user } = await getAdminContext();
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load organization membership: ${error.message}`);
  }

  if (!member) return null;

  return {
    organizationId: member.organization_id as string,
    role: member.role as OrganizationRole,
  };
});

export async function getAdminMembership() {
  return getCachedAdminMembership();
}

const getCachedAdminProfileRole = cache(async () => {
  const { supabase, user } = await getAdminContext();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load profile role: ${error.message}`);
  }

  return typeof data?.role === "string" ? data.role : null;
});

export async function getAdminProfileRole() {
  return getCachedAdminProfileRole();
}

export async function verifyRole(allowedRoles: OrganizationRole[]) {
  const { supabase, user } = await getAdminContext();
  const member = await getAdminMembership();

  if (!member) {
    throw new Error("Unauthorized: Member not found in organization");
  }

  if (!allowedRoles.includes(member.role)) {
    throw new Error(`Unauthorized: Insufficient permissions for role ${member.role}`);
  }

  return {
    supabase,
    user,
    role: member.role,
    organizationId: member.organizationId,
  };
}

export async function requireSuperAdmin() {
  const context = await getAdminContext();
  const allowed = (await getAdminProfileRole()) === "admin";

  if (!allowed) {
    throw new Error("Unauthorized: Super admin access required");
  }

  return context;
}
