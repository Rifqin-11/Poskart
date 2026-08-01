import { redirect } from "next/navigation";
import { getMyTrialRequest } from "@/server/admin/actions/trial-actions";
import { getSubscriptionStatus } from "@/server/admin/actions/dashboard-actions";
import { TrialPage } from "@/features/admin/trial/trial-page";

export default async function TrialRoute() {
  const [subscription, trialRequest] = await Promise.all([
    getSubscriptionStatus(),
    getMyTrialRequest(),
  ]);

  // Already on paid plan — no trial needed
  if (subscription.isActive && subscription.status !== "trialing") {
    redirect("/dashboard");
  }

  return <TrialPage subscription={subscription} trialRequest={trialRequest} />;
}
