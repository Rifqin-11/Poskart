import type { SupabaseClient } from "@supabase/supabase-js";

import { pricingPlans, type PricingPlan } from "@/lib/constants/business";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

type SubscriptionPlanRow = {
  id: string;
  name: string;
  duration_months: number;
  base_price: number;
  included_devices: number;
  additional_device_price_monthly: number;
  is_public: boolean;
};

const PLAN_ORDER = ["monthly", "quarterly", "semiannual", "yearly"];

export async function getPublicSubscriptionPricingPlans(
  supabaseClient?: SupabaseClient,
): Promise<PricingPlan[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id,name,duration_months,base_price,included_devices,additional_device_price_monthly,is_public",
    )
    .in("id", PLAN_ORDER)
    .eq("is_public", true)
    .order("duration_months", { ascending: true });

  if (error || !data?.length) {
    return pricingPlans;
  }

  return (data as SubscriptionPlanRow[])
    .sort((left, right) => PLAN_ORDER.indexOf(left.id) - PLAN_ORDER.indexOf(right.id))
    .map(mapDbPlanToPricingPlan);
}

function mapDbPlanToPricingPlan(row: SubscriptionPlanRow): PricingPlan {
  const fallback = pricingPlans.find((plan) => plan.id === row.id);
  const durationLabel =
    row.duration_months === 1 ? "1 month" : `${row.duration_months} months`;
  const deviceLabel =
    row.included_devices === 1 ? "1 device" : `${row.included_devices} devices`;
  const addOnLabel = `${formatCurrency(row.additional_device_price_monthly)}/device/month`;

  return {
    id: row.id,
    name: row.name,
    price: formatCompactCurrency(row.base_price),
    amount: row.base_price,
    durationMonths: row.duration_months,
    includedDevices: row.included_devices,
    additionalDevicePriceMonthly: row.additional_device_price_monthly,
    period: periodLabel(row.duration_months),
    duration: `${durationLabel} access`,
    description:
      fallback?.description ??
      `Subscription package for ${durationLabel} POSKART access.`,
    cta: fallback?.cta ?? `Subscribe ${row.name}`,
    highlighted: row.id === "yearly",
    features: [
      "POSKART dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      `${deviceLabel} included`,
      `Additional device ${addOnLabel}`,
    ],
    limits: [`${durationLabel} access`, `${deviceLabel} included`, `Add-on ${addOnLabel}`],
  };
}

function periodLabel(durationMonths: number) {
  if (durationMonths === 1) return "/month";
  if (durationMonths === 12) return "/year";
  return `/${durationMonths} months`;
}

function formatCompactCurrency(amount: number) {
  if (amount >= 1000 && amount % 1000 === 0) {
    return `Rp ${amount / 1000}K`;
  }

  return formatCurrency(amount);
}
