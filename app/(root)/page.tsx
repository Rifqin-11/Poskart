import { HomePage } from "@/features/root/home/home-page";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";

export default async function Page() {
  const plans = await getPublicSubscriptionPricingPlans();

  return <HomePage plans={plans} />;
}
