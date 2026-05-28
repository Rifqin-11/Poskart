import { Suspense } from "react";
import { CheckoutContent } from "@/components/checkout/checkout-content";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getPublicSubscriptionPricingPlans } from "@/lib/subscription-pricing";

type GatewayMode = "duitku" | "midtrans" | "both";

const gatewayModes: GatewayMode[] = ["duitku", "midtrans", "both"];

export default async function CheckoutPage() {
  const supabase = await createClient();
  const [gatewayMode, plans] = await Promise.all([
    getGatewayMode(supabase),
    getPublicSubscriptionPricingPlans(supabase),
  ]);

  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><Skeleton className="h-[520px]" /></div>}>
      <CheckoutContent gatewayMode={gatewayMode} plans={plans} />
    </Suspense>
  );
}

async function getGatewayMode(supabase: Awaited<ReturnType<typeof createClient>>): Promise<GatewayMode> {
  const { data } = await supabase
    .from("app_configs")
    .select("subscription_payment_gateway")
    .eq("id", "default")
    .maybeSingle();
  const value = data?.subscription_payment_gateway;

  return gatewayModes.includes(value as GatewayMode) ? (value as GatewayMode) : "duitku";
}
