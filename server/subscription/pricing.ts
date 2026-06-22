import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PRICING_PLAN_ORDER,
  pricingPlans,
  type PricingPlan,
} from "@/lib/constants/business";
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

export async function getPublicSubscriptionPricingPlans(
  supabaseClient?: SupabaseClient,
): Promise<PricingPlan[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id,name,duration_months,base_price,included_devices,additional_device_price_monthly,is_public",
    )
    .in("id", PRICING_PLAN_ORDER)
    .eq("is_public", true)
    .order("duration_months", { ascending: true });

  if (error || !data?.length) {
    return pricingPlans;
  }

  const mapped = (data as SubscriptionPlanRow[])
    .sort((left, right) => {
      return (
        PRICING_PLAN_ORDER.indexOf(left.id) - PRICING_PLAN_ORDER.indexOf(right.id)
      );
    })
    .map(mapDbPlanToPricingPlan);

  return mapped;
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
    tierId: fallback?.tierId,
    audience: fallback?.audience,
    price: formatCurrency(row.base_price),
    amount: row.base_price,
    compareAtAmount: fallback?.compareAtAmount,
    durationMonths: row.duration_months,
    includedDevices: row.included_devices,
    additionalDevicePriceMonthly: row.additional_device_price_monthly,
    period: fallback?.period ?? periodLabel(row.duration_months),
    duration: `${durationLabel} access`,
    description:
      fallback?.description ??
      `Subscription package for ${durationLabel} POSKART access.`,
    cta: fallback?.cta ?? `Subscribe ${row.name}`,
    highlighted: fallback?.highlighted ?? row.included_devices === 3,
    features: fallback?.features ?? [
      "POSKART dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      `${deviceLabel} included`,
      `Additional device ${addOnLabel}`,
    ],
    limits: fallback?.limits ?? [`${durationLabel} access`, `${deviceLabel} included`, `Add-on ${addOnLabel}`],
  };
}

function periodLabel(durationMonths: number) {
  if (durationMonths === 1) return "/bulan";
  if (durationMonths === 12) return "/tahun";
  return `/${durationMonths} bulan`;
}
