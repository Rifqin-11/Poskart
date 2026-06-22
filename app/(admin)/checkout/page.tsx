import { Suspense } from "react";
import { CheckoutContent } from "@/features/billing/checkout/checkout-content";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getDuitkuConfig } from "@/server/payments/duitku";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";

type GatewayMode = "duitku" | "midtrans" | "both";

const gatewayModes: GatewayMode[] = ["duitku", "midtrans", "both"];

export default async function CheckoutPage() {
  const supabase = await createClient();
  const [gatewayMode, plans] = await Promise.all([
    getGatewayMode(supabase),
    getPublicSubscriptionPricingPlans(supabase),
  ]);
  const duitkuPopScriptUrl =
    getDuitkuConfig()?.popScriptUrl ?? "https://app-prod.duitku.com/lib/js/duitku.js";

  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><Skeleton className="h-[520px]" /></div>}>
      <CheckoutContent
        gatewayMode={gatewayMode}
        plans={plans}
        duitkuPopScriptUrl={duitkuPopScriptUrl}
      />
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
