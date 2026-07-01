"use server";

import { getAdminContext } from "@/server/admin/context";
import { PRICING_PLAN_ORDER } from "@/lib/constants/business";
import {
  assertSupabaseResult,
  mapPricingProduct,
  mapSubscriptionPlan,
  type PricingProduct,
  type PricingProductInput,
  type PricingProductRow,
  type SubscriptionPlan,
  type SubscriptionPlanInput,
  type SubscriptionPlanRow,
} from "../_shared/admin-types";

export async function getPricingProducts(): Promise<PricingProduct[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("pricing_products")
    .select("id,name,price,promo_price,print_limit,qris_download,live_photo_enabled,gif_enabled,active")
    .order("price", { ascending: true });

  return assertSupabaseResult(
    data as PricingProductRow[] | null,
    error,
    "Unable to load pricing products",
  ).map(mapPricingProduct);
}

export async function createPricingProduct(
  values: PricingProductInput,
): Promise<void> {
  const { supabase } = await getAdminContext();
  const id = `PRC-${Date.now()}`;
  const { error } = await supabase.from("pricing_products").insert({
    id,
    name: values.name,
    price: values.price,
    promo_price: values.promoPrice ?? null,
    print_limit: values.printLimit,
    qris_download: values.qrisDownload,
    live_photo_enabled: values.livePhotoEnabled,
    gif_enabled: values.gifEnabled,
    active: values.active,
    updated_at: new Date().toISOString(),
  });
  if (error)
    throw new Error(`Unable to create pricing product: ${error.message}`);
}

export async function updatePricingProduct(
  id: string,
  patch: Partial<PricingProductInput>,
): Promise<void> {
  const { supabase } = await getAdminContext();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.promoPrice !== undefined)
    dbPatch.promo_price = patch.promoPrice ?? null;
  if (patch.printLimit !== undefined) dbPatch.print_limit = patch.printLimit;
  if (patch.qrisDownload !== undefined)
    dbPatch.qris_download = patch.qrisDownload;
  if (patch.livePhotoEnabled !== undefined) {
    dbPatch.live_photo_enabled = patch.livePhotoEnabled;
  }
  if (patch.gifEnabled !== undefined) dbPatch.gif_enabled = patch.gifEnabled;
  if (patch.active !== undefined) dbPatch.active = patch.active;

  const { error } = await supabase
    .from("pricing_products")
    .update(dbPatch)
    .eq("id", id);
  if (error)
    throw new Error(`Unable to update pricing product: ${error.message}`);
}

export async function deletePricingProduct(id: string): Promise<void> {
  const { supabase } = await getAdminContext();
  const { error } = await supabase
    .from("pricing_products")
    .delete()
    .eq("id", id);
  if (error)
    throw new Error(`Unable to delete pricing product: ${error.message}`);
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id,name,max_devices,duration_months,base_price,included_devices,additional_device_price_monthly,is_public,features",
    )
    .in("id", PRICING_PLAN_ORDER)
    .order("duration_months", { ascending: true });

  return assertSupabaseResult(
    data as SubscriptionPlanRow[] | null,
    error,
    "Unable to load subscription plans",
  ).map(mapSubscriptionPlan);
}

export async function updateSubscriptionPlan(
  id: string,
  values: SubscriptionPlanInput,
): Promise<void> {
  const { supabase } = await getAdminContext();
  const includedDevices = Math.max(1, Math.floor(values.includedDevices || 1));
  const durationMonths = Math.max(1, Math.floor(values.durationMonths || 1));
  const additionalDevicePriceMonthly = Math.max(
    0,
    Math.floor(values.additionalDevicePriceMonthly || 0),
  );
  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name: values.name.trim(),
      max_devices: includedDevices,
      duration_months: durationMonths,
      base_price: Math.max(0, Math.floor(values.basePrice || 0)),
      included_devices: includedDevices,
      additional_device_price_monthly: additionalDevicePriceMonthly,
      is_public: values.isPublic,
      features: {
        included: `${includedDevices} device${includedDevices > 1 ? "s" : ""}`,
        addon: `Rp ${Math.round(additionalDevicePriceMonthly / 1000)}K/device/month`,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error)
    throw new Error(`Unable to update subscription plan: ${error.message}`);
}
