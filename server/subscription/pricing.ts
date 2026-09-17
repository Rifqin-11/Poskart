import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import {
  PRICING_PLAN_ORDER,
  pricingPlans,
  type PricingPlan,
} from "@/lib/constants/business";
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

/**
 * Cookie-less Supabase client for public, non-personalized reads.
 *
 * The session-aware client from `lib/supabase/server` calls `cookies()`, which
 * forces the whole route into dynamic rendering. Public pricing is identical
 * for every visitor, so it is read with the anon key and cached instead — that
 * lets the landing page be prerendered and served from the CDN.
 */
function createPublicReadClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function loadPublicSubscriptionPricingPlans(): Promise<PricingPlan[]> {
  const supabase = createPublicReadClient();
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

const cachedPublicSubscriptionPricingPlans = unstable_cache(
  loadPublicSubscriptionPricingPlans,
  ["public-subscription-pricing-plans"],
  { revalidate: 600, tags: ["public-subscription-pricing-plans"] },
);

/**
 * Public pricing plans. Cached for 10 minutes; callers may pass an explicit
 * Supabase client (admin/checkout flows) to bypass the cache.
 */
export async function getPublicSubscriptionPricingPlans(
  supabaseClient?: SupabaseClient,
): Promise<PricingPlan[]> {
  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("subscription_plans")
      .select(
        "id,name,duration_months,base_price,included_devices,additional_device_price_monthly,is_public",
      )
      .in("id", PRICING_PLAN_ORDER)
      .eq("is_public", true)
      .order("duration_months", { ascending: true });

    if (error || !data?.length) return pricingPlans;

    return (data as SubscriptionPlanRow[])
      .sort(
        (left, right) =>
          PRICING_PLAN_ORDER.indexOf(left.id) -
          PRICING_PLAN_ORDER.indexOf(right.id),
      )
      .map(mapDbPlanToPricingPlan);
  }

  return cachedPublicSubscriptionPricingPlans();
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
      "Cash payment recording",
      "Visitor queue management",
      "Public showcase",
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
