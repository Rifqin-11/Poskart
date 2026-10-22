import { redirect } from "next/navigation";
import { getMyTrialEligibility } from "@/server/admin/actions/trial-actions";
import { getSubscriptionStatus } from "@/server/admin/actions/dashboard-actions";
import { TrialPage } from "@/features/admin/trial/trial-page";

export default async function TrialRoute() {
  const [subscription, eligibility] = await Promise.all([
    getSubscriptionStatus(),
    getMyTrialEligibility(),
  ]);

  // Already on paid plan — no trial needed
  if (subscription.isActive && subscription.status !== "trialing") {
    redirect("/dashboard");
  }

  return <TrialPage eligibility={eligibility} />;
}
