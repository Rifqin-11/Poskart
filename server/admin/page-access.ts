import { redirect } from "next/navigation";
import { isSubscriptionActive } from "@/lib/subscription-policy";
import {
  getAdminContext,
  getAdminMembership,
  getAdminProfileRole,
} from "@/server/admin/context";

/** Server-side route guards used after middleware has verified the session. */
export async function requireOrganizationMembershipAccess() {
  const membership = await getAdminMembership();
  if (!membership) redirect("/onboarding");
  return membership;
}

/**
 * Keeps paid admin routes protected without doing subscription reads in every
 * middleware navigation request. Super admins retain their existing bypass.
 */
export async function requireOrganizationSubscriptionAccess(nextPath: string) {
  const [{ supabase }, membership, profileRole] = await Promise.all([
    getAdminContext(),
    getAdminMembership(),
    getAdminProfileRole(),
  ]);

  if (!membership) redirect("/onboarding");
  if (profileRole === "admin") return membership;

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("plan_id,status,current_period_end")
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (error || !isSubscriptionActive(subscription)) {
    const params = new URLSearchParams({
      tab: "organization",
      subscription: "required",
      next: nextPath,
    });
    redirect(`/settings?${params.toString()}`);
  }

  return membership;
}
