import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutContent, type SubscriptionRenewalPreview } from "@/features/billing/checkout/checkout-content";

export const metadata: Metadata = {
  title: "Checkout | POSKART",
  robots: {
    index: false,
    follow: false,
  },
};
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getDuitkuConfig } from "@/server/payments/duitku";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";
import { addMonths } from "@/server/subscription/activation";
import type { PricingPlan } from "@/lib/constants/business";

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
  const renewalPreview = await getSubscriptionRenewalPreview(supabase, plans);

  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><Skeleton className="h-[520px]" /></div>}>
      <CheckoutContent
        gatewayMode={gatewayMode}
        plans={plans}
        duitkuPopScriptUrl={duitkuPopScriptUrl}
        renewalPreview={renewalPreview}
      />
    </Suspense>
  );
}

async function getSubscriptionRenewalPreview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  plans: PricingPlan[],
): Promise<SubscriptionRenewalPreview | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  // Resolve the same organization used when creating the subscription order.
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", authData.user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership?.organization_id) return null;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (subscriptionError || !subscription?.current_period_end) return null;

  const now = Date.now();
  const expiry = new Date(subscription.current_period_end);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now) return null;

  const dayInMilliseconds = 24 * 60 * 60 * 1000;
  const remainingDays = Math.ceil((expiry.getTime() - now) / dayInMilliseconds);

  return {
    expiresAt: expiry.toISOString(),
    remainingDays,
    plans: Object.fromEntries(plans.map((plan) => {
      const renewedExpiry = addMonths(expiry, Math.max(1, plan.durationMonths || 1));
      const totalDays = Math.ceil((renewedExpiry.getTime() - now) / dayInMilliseconds);
      return [plan.id, {
        additionalDays: totalDays - remainingDays,
        totalDays,
        expiresAt: renewedExpiry.toISOString(),
      }];
    })),
  };
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
