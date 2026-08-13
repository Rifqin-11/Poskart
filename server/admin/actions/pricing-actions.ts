"use server";

import {
  getAdminContext,
  requireSuperAdmin,
  verifyRole,
} from "@/server/admin/context";
import { PRICING_PLAN_ORDER } from "@/lib/constants/business";
import { parseJakartaDateTimeInput } from "@/lib/jakarta-time";
import { normalizePhotoSlotPriceTiers } from "@/lib/pricing/photo-slot-pricing";
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
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "akuntan",
  ]);
  const { data, error } = await supabase
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,pricing_mode,photo_slot_price,photo_slot_promo_price,photo_slot_prices,print_limit,qris_download,live_photo_enabled,gif_enabled,active,access_mode,requires_reprint_password,event_name,event_expires_at",
    )
    .eq("organization_id", organizationId)
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
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "akuntan",
  ]);
  const id = `PRC-${Date.now()}`;
  const accessMode = values.accessMode === "event" ? "event" : "paid";
  const eventName = values.eventName?.trim() || null;
  const eventExpiresAt = normalizeEventExpiry(values.eventExpiresAt);
  const pricingMode = normalizePricingMode(values.pricingMode, accessMode);
  assertPricingValues(values, accessMode, pricingMode);
  const { error } = await supabase.from("pricing_products").insert({
    id,
    organization_id: organizationId,
    name: values.name,
    price: accessMode === "event" ? 0 : Math.max(0, Math.round(values.price)),
    promo_price: accessMode === "event" ? null : (values.promoPrice ?? null),
    pricing_mode: pricingMode,
    photo_slot_price:
      accessMode === "paid" ? normalizeOptionalMoney(values.photoSlotPrice) : null,
    photo_slot_promo_price:
      accessMode === "paid"
        ? normalizeOptionalMoney(values.photoSlotPromoPrice)
        : null,
    photo_slot_prices:
      accessMode === "paid" && pricingMode === "per_photo_slot"
        ? normalizePhotoSlotPriceTiers(values.photoSlotPrices)
        : [],
    print_limit: values.printLimit,
    qris_download: accessMode === "paid" && values.qrisDownload,
    live_photo_enabled: values.livePhotoEnabled,
    gif_enabled: values.gifEnabled,
    active: values.active,
    access_mode: accessMode,
    requires_reprint_password:
      accessMode === "event" ? values.requiresReprintPassword : true,
    event_name: accessMode === "event" ? eventName : null,
    event_expires_at: accessMode === "event" ? eventExpiresAt : null,
    updated_at: new Date().toISOString(),
  });
  if (error)
    throw new Error(`Unable to create pricing product: ${error.message}`);
}

export async function updatePricingProduct(
  id: string,
  patch: Partial<PricingProductInput>,
): Promise<void> {
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "akuntan",
  ]);
  const { data: current, error: currentError } = await supabase
    .from("pricing_products")
    .select("access_mode,pricing_mode")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (currentError)
    throw new Error(`Unable to read pricing product: ${currentError.message}`);
  if (!current) throw new Error("Pricing product not found in this organization.");
  const accessMode =
    patch.accessMode === "event" || patch.accessMode === "paid"
      ? patch.accessMode
      : current?.access_mode === "event"
        ? "event"
        : "paid";
  const pricingMode = normalizePricingMode(
    patch.pricingMode,
    accessMode,
    current.pricing_mode,
  );
  const effectiveValues = await loadEffectivePricingValues(
    supabase,
    organizationId,
    id,
    patch,
  );
  assertPricingValues(effectiveValues, accessMode, pricingMode);
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.price !== undefined && accessMode !== "event")
    dbPatch.price = Math.max(0, Math.round(patch.price));
  if (patch.promoPrice !== undefined)
    dbPatch.promo_price =
      accessMode === "event" ? null : (patch.promoPrice ?? null);
  if (patch.pricingMode !== undefined || accessMode === "event") {
    dbPatch.pricing_mode = pricingMode;
  }
  if (patch.photoSlotPrice !== undefined) {
    dbPatch.photo_slot_price =
      accessMode === "event" ? null : normalizeOptionalMoney(patch.photoSlotPrice);
  }
  if (patch.photoSlotPromoPrice !== undefined) {
    dbPatch.photo_slot_promo_price =
      accessMode === "event"
        ? null
        : normalizeOptionalMoney(patch.photoSlotPromoPrice);
  }
  if (patch.photoSlotPrices !== undefined) {
    dbPatch.photo_slot_prices =
      accessMode === "paid" && pricingMode === "per_photo_slot"
        ? normalizePhotoSlotPriceTiers(patch.photoSlotPrices)
        : [];
  }
  if (patch.printLimit !== undefined) dbPatch.print_limit = patch.printLimit;
  if (patch.qrisDownload !== undefined)
    dbPatch.qris_download = accessMode === "event" ? false : patch.qrisDownload;
  if (patch.livePhotoEnabled !== undefined) {
    dbPatch.live_photo_enabled = patch.livePhotoEnabled;
  }
  if (patch.gifEnabled !== undefined) dbPatch.gif_enabled = patch.gifEnabled;
  if (patch.active !== undefined) dbPatch.active = patch.active;
  if (patch.requiresReprintPassword !== undefined) {
    dbPatch.requires_reprint_password =
      accessMode === "event" ? patch.requiresReprintPassword : true;
  }
  if (patch.accessMode !== undefined) {
    dbPatch.access_mode = accessMode;
    if (accessMode === "event") {
      dbPatch.price = 0;
      dbPatch.promo_price = null;
      dbPatch.qris_download = false;
      dbPatch.pricing_mode = "flat";
      dbPatch.photo_slot_price = null;
      dbPatch.photo_slot_promo_price = null;
      dbPatch.photo_slot_prices = [];
      dbPatch.requires_reprint_password =
        patch.requiresReprintPassword ?? true;
      dbPatch.event_name = patch.eventName?.trim() || null;
      dbPatch.event_expires_at = normalizeEventExpiry(patch.eventExpiresAt);
    } else {
      dbPatch.event_name = null;
      dbPatch.event_expires_at = null;
      dbPatch.requires_reprint_password = true;
    }
  } else if (accessMode === "event") {
    if (patch.qrisDownload !== undefined) dbPatch.qris_download = false;
    if (patch.eventName !== undefined)
      dbPatch.event_name = patch.eventName?.trim() || null;
    if (patch.eventExpiresAt !== undefined)
      dbPatch.event_expires_at = normalizeEventExpiry(patch.eventExpiresAt);
  }

  const { error } = await supabase
    .from("pricing_products")
    .update(dbPatch)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error)
    throw new Error(`Unable to update pricing product: ${error.message}`);
}

function normalizePricingMode(
  value: PricingProductInput["pricingMode"] | undefined,
  accessMode: PricingProductInput["accessMode"],
  fallback?: unknown,
) {
  if (accessMode === "event") return "flat" as const;
  if (value === "per_photo_slot") return "per_photo_slot" as const;
  if (value === "flat") return "flat" as const;
  return fallback === "per_photo_slot" ? "per_photo_slot" : "flat";
}

function normalizeOptionalMoney(value: number | undefined) {
  if (value == null) return null;
  const amount = Math.round(Number(value));
  return Number.isFinite(amount) ? Math.max(0, amount) : null;
}

function assertPricingValues(
  values: Pick<
    PricingProductInput,
    | "price"
    | "promoPrice"
    | "photoSlotPrice"
    | "photoSlotPromoPrice"
    | "photoSlotPrices"
  >,
  accessMode: PricingProductInput["accessMode"],
  pricingMode: PricingProductInput["pricingMode"],
) {
  if (accessMode !== "paid") return;

  const tiers = normalizePhotoSlotPriceTiers(values.photoSlotPrices);
  const amount = values.promoPrice ?? values.price;
  if (pricingMode === "per_photo_slot" && tiers.length === 0) {
    throw new Error("Tambahkan minimal harga untuk 1 photo slot.");
  }
  if (
    pricingMode !== "per_photo_slot" &&
    (!Number.isFinite(Number(amount)) || Number(amount) <= 0)
  ) {
    throw new Error(
      "Harga sesi harus lebih dari 0.",
    );
  }
}

async function loadEffectivePricingValues(
  supabase: Awaited<ReturnType<typeof verifyRole>>["supabase"],
  organizationId: string,
  id: string,
  patch: Partial<PricingProductInput>,
) {
  const { data, error } = await supabase
    .from("pricing_products")
    .select("price,promo_price,photo_slot_price,photo_slot_promo_price,photo_slot_prices")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw new Error(`Unable to read pricing values: ${error.message}`);

  return {
    price: patch.price ?? Number(data.price),
    promoPrice:
      patch.promoPrice !== undefined
        ? patch.promoPrice
        : data.promo_price ?? undefined,
    photoSlotPrice:
      patch.photoSlotPrice !== undefined
        ? patch.photoSlotPrice
        : data.photo_slot_price ?? undefined,
    photoSlotPromoPrice:
      patch.photoSlotPromoPrice !== undefined
        ? patch.photoSlotPromoPrice
        : data.photo_slot_promo_price ?? undefined,
    photoSlotPrices:
      patch.photoSlotPrices !== undefined
        ? patch.photoSlotPrices
        : normalizePhotoSlotPriceTiers(data.photo_slot_prices),
  };
}

function normalizeEventExpiry(value: string | undefined) {
  if (!value?.trim()) return null;
  const date = parseJakartaDateTimeInput(value);
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error("Event expiry must be a valid date.");
  }
  return date.toISOString();
}

export async function deletePricingProduct(id: string): Promise<void> {
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "akuntan",
  ]);
  const { error } = await supabase
    .from("pricing_products")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
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
  const { supabase } = await requireSuperAdmin();
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
