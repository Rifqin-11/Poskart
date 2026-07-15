import "server-only";

import {
  KioskApiError,
  type KioskDeviceRow,
  type KioskRequestContext,
} from "@/lib/kiosk/server";

type PricingProductRow = {
  id: string;
  name: string;
  price: number;
  promo_price: number | null;
  print_limit: number | null;
  active: boolean;
  access_mode: "paid" | "event" | null;
  event_name: string | null;
  event_expires_at: string | null;
};

export type ResolvedKioskPricingProduct = {
  id: string;
  name: string;
  amount: number;
  printCount: number;
  accessMode: "paid" | "event";
  eventName: string | null;
  eventExpiresAt: string | null;
};

export async function resolveKioskPricingProduct(
  context: KioskRequestContext,
  device: KioskDeviceRow,
  packageCode: string,
): Promise<ResolvedKioskPricingProduct> {
  const normalizedCode = packageCode.trim();
  if (!normalizedCode) {
    throw new KioskApiError(
      "Package code is required.",
      400,
      "KIOSK_PACKAGE_REQUIRED",
    );
  }

  const product = await findPricingProduct(context, normalizedCode);
  if (!product?.active) {
    throw new KioskApiError(
      "The selected package is not available.",
      400,
      "KIOSK_PACKAGE_INVALID",
    );
  }

  const accessMode = product.access_mode === "event" ? "event" : "paid";
  if (accessMode === "event" && product.event_expires_at) {
    const expiry = new Date(product.event_expires_at).getTime();
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      throw new KioskApiError(
        "This event access has expired.",
        400,
        "KIOSK_EVENT_EXPIRED",
      );
    }
  }

  const assignedPricing = new Set([
    ...(device.pricing_profiles ?? []),
    ...(device.pricing_profile ? [device.pricing_profile] : []),
  ]);
  if (accessMode === "event" && assignedPricing.size === 0) {
    throw new KioskApiError(
      "Event access must be explicitly assigned to this device.",
      403,
      "KIOSK_EVENT_NOT_ASSIGNED",
    );
  }
  if (
    assignedPricing.size > 0 &&
    !assignedPricing.has(product.id) &&
    !assignedPricing.has(product.name)
  ) {
    throw new KioskApiError(
      "The selected package is not assigned to this device.",
      403,
      "KIOSK_PACKAGE_NOT_ASSIGNED",
    );
  }

  const amount = Math.max(
    0,
    Math.round(product.promo_price ?? product.price ?? 0),
  );
  if (accessMode === "paid" && amount <= 0) {
    throw new KioskApiError(
      "The selected package has an invalid price.",
      400,
      "KIOSK_PACKAGE_PRICE_INVALID",
    );
  }

  return {
    id: product.id,
    name: product.name,
    amount,
    printCount: Math.max(1, Math.round(product.print_limit ?? 1)),
    accessMode,
    eventName: product.event_name,
    eventExpiresAt: product.event_expires_at,
  };
}

async function findPricingProduct(
  context: KioskRequestContext,
  packageCode: string,
) {
  const { data: byId, error: idError } = await context.client
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,print_limit,active,access_mode,event_name,event_expires_at",
    )
    .eq("id", packageCode)
    .maybeSingle();
  if (idError) throw idError;
  if (byId) return byId as PricingProductRow;

  const { data: byName, error: nameError } = await context.client
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,print_limit,active,access_mode,event_name,event_expires_at",
    )
    .eq("name", packageCode)
    .maybeSingle();
  if (nameError) throw nameError;
  return (byName ?? null) as PricingProductRow | null;
}
