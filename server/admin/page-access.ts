import { redirect } from "next/navigation";
import {
  getAdminMembership,
  getOptionalAdminContext,
} from "@/server/admin/context";

/** Server-side route guards used after middleware has verified the session. */
export async function requireOrganizationMembershipAccess() {
  // A stale/expired session can reach the render before middleware refreshes it.
  // Redirect instead of letting getAdminContext throw "Not authenticated".
  const context = await getOptionalAdminContext();
  if (!context) redirect("/login");

  const membership = await getAdminMembership();
  if (!membership) redirect("/onboarding");
  return membership;
}
