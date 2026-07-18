import { redirect } from "next/navigation";
import {
  normalizeOrganizationFeatures,
  type OrganizationFeatureKey,
} from "@/lib/organization-features";
import {
  getAdminContext,
  getAdminMembership,
  getAdminProfileRole,
} from "@/server/admin/context";

export async function hasOrganizationFeatureAccess(
  feature: OrganizationFeatureKey,
) {
  const { supabase } = await getAdminContext();

  if ((await getAdminProfileRole()) === "admin") {
    return true;
  }

  const membership = await getAdminMembership();
  if (!membership) {
    return false;
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("features")
    .eq("id", membership.organizationId)
    .maybeSingle();

  return normalizeOrganizationFeatures(organization?.features)[feature];
}

export async function requireOrganizationFeatureAccess(
  feature: OrganizationFeatureKey,
) {
  const hasAccess = await hasOrganizationFeatureAccess(feature);

  if (!hasAccess) {
    redirect("/dashboard");
  }
}
