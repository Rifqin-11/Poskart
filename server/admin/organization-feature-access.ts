import { redirect } from "next/navigation";
import { isSuperAdminProfile } from "@/lib/auth/admin";
import {
  normalizeOrganizationFeatures,
  type OrganizationFeatureKey,
} from "@/lib/organization-features";
import { getAdminContext } from "@/server/admin/context";

export async function hasOrganizationFeatureAccess(
  feature: OrganizationFeatureKey,
) {
  const { supabase, user } = await getAdminContext();

  if (await isSuperAdminProfile(supabase, user.id)) {
    return true;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return false;
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("features")
    .eq("id", membership.organization_id)
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
