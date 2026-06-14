import { HomePage } from "@/features/root/home/home-page";
import { getLatestAppRelease } from "@/server/releases/github-release";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";

export default async function Page() {
  const [plans, latestRelease] = await Promise.all([
    getPublicSubscriptionPricingPlans(),
    getLatestAppRelease(),
  ]);

  return <HomePage plans={plans} latestRelease={latestRelease} />;
}
