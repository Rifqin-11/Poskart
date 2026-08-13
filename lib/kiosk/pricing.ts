import "server-only";

import {
  KioskApiError,
  type KioskDeviceRow,
  type KioskRequestContext,
} from "@/lib/kiosk/server";
import {
  calculatePhotoPricingQuote,
  normalizePhotoSlotPriceTiers,
  type PhotoPricingMode,
} from "@/lib/pricing/photo-slot-pricing";

type PricingProductRow = {
  id: string;
  name: string;
  price: number;
  promo_price: number | null;
  pricing_mode: PhotoPricingMode | null;
  photo_slot_price: number | null;
  photo_slot_promo_price: number | null;
  photo_slot_prices: unknown;
  print_limit: number | null;
  active: boolean;
  access_mode: "paid" | "event" | null;
  requires_reprint_password: boolean | null;
  event_name: string | null;
  event_expires_at: string | null;
};

export type ResolvedKioskPricingProduct = {
  id: string;
  name: string;
  amount: number;
  pricingMode: PhotoPricingMode;
  photoSlotPrice: number | null;
  photoSlotPromoPrice: number | null;
  photoSlotPrices: ReturnType<typeof normalizePhotoSlotPriceTiers>;
  printCount: number;
  accessMode: "paid" | "event";
  requiresReprintPassword: boolean;
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

  const { data: pricingAssignments, error: pricingAssignmentsError } =
    await context.client
      .from("device_pricing_products")
      .select("pricing_product_id")
      .eq("organization_id", context.organizationId)
      .eq("device_id", device.id)
      .order("display_order", { ascending: true });
  if (pricingAssignmentsError) throw pricingAssignmentsError;

  const assignedPricingIds = (pricingAssignments ?? [])
    .map((assignment) => assignment.pricing_product_id)
    .filter((id): id is string => Boolean(id));
  // The legacy values are only for devices that have not been migrated yet.
  const assignedPricing = new Set(
    assignedPricingIds.length > 0
      ? assignedPricingIds
      : [
          ...(device.pricing_profiles ?? []),
          ...(device.pricing_profile ? [device.pricing_profile] : []),
        ],
  );
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

  const pricingMode =
    product.pricing_mode === "per_photo_slot" ? "per_photo_slot" : "flat";
  const photoSlotPrices = normalizePhotoSlotPriceTiers(
    product.photo_slot_prices,
  );
  const amount = Math.max(
    0,
    Math.round(
      pricingMode === "per_photo_slot"
        ? photoSlotPrices[0]?.promoPrice ??
          photoSlotPrices[0]?.price ??
          product.photo_slot_promo_price ??
          product.photo_slot_price ??
          0
        : product.promo_price ?? product.price ?? 0,
    ),
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
    pricingMode,
    photoSlotPrice: product.photo_slot_price,
    photoSlotPromoPrice: product.photo_slot_promo_price,
    photoSlotPrices,
    printCount: Math.max(1, Math.round(product.print_limit ?? 1)),
    accessMode,
    requiresReprintPassword: product.requires_reprint_password ?? true,
    eventName: product.event_name,
    eventExpiresAt: product.event_expires_at,
  };
}

export type ResolvedKioskPricingQuote = ResolvedKioskPricingProduct & {
  unitAmount: number;
  photoSlotCount: number | null;
  templateId: string | null;
  pricingSnapshot: Record<string, unknown>;
};

export async function resolveKioskPricingQuote(
  context: KioskRequestContext,
  device: KioskDeviceRow,
  packageCode: string,
  templateId?: string | null,
): Promise<ResolvedKioskPricingQuote> {
  const product = await resolveKioskPricingProduct(
    context,
    device,
    packageCode,
  );
  const template = await resolvePricingTemplate(
    context,
    device,
    templateId?.trim() || null,
    product.pricingMode === "per_photo_slot",
  );

  if (product.accessMode === "event") {
    return {
      ...product,
      amount: 0,
      unitAmount: 0,
      photoSlotCount: template?.photoCount ?? null,
      templateId: template?.id ?? null,
      pricingSnapshot: {
        mode: "flat",
        unitAmount: 0,
        photoSlotCount: template?.photoCount ?? null,
        finalAmount: 0,
        templateId: template?.id ?? null,
      },
    };
  }

  try {
    const quote = calculatePhotoPricingQuote(
      {
        pricingMode: product.pricingMode,
        price: product.amount,
        promoPrice: null,
        photoSlotPrice: product.photoSlotPrice,
        photoSlotPromoPrice: product.photoSlotPromoPrice,
        photoSlotPrices: product.photoSlotPrices,
      },
      template?.photoCount,
    );

    return {
      ...product,
      amount: quote.amount,
      unitAmount: quote.unitAmount,
      photoSlotCount: quote.photoSlotCount,
      templateId: template?.id ?? null,
      pricingSnapshot: {
        mode: quote.pricingMode,
        unitAmount: quote.unitAmount,
        photoSlotCount: quote.photoSlotCount,
        finalAmount: quote.amount,
        templateId: template?.id ?? null,
      },
    };
  } catch (error) {
    throw new KioskApiError(
      error instanceof Error ? error.message : "Harga paket tidak valid.",
      400,
      "KIOSK_PACKAGE_PRICE_INVALID",
    );
  }
}

async function resolvePricingTemplate(
  context: KioskRequestContext,
  device: KioskDeviceRow,
  templateId: string | null,
  required: boolean,
) {
  if (!templateId) {
    if (required) {
      throw new KioskApiError(
        "Pilih frame terlebih dahulu untuk menghitung harga paket.",
        400,
        "KIOSK_TEMPLATE_REQUIRED_FOR_PRICING",
      );
    }
    return null;
  }

  const [{ data: template, error: templateError }, assignmentsResult] =
    await Promise.all([
      context.client
        .from("templates")
        .select("id,photo_count,status")
        .eq("organization_id", context.organizationId)
        .eq("id", templateId)
        .eq("status", "published")
        .maybeSingle(),
      context.client
        .from("device_frame_templates")
        .select("template_id")
        .eq("organization_id", context.organizationId)
        .eq("device_id", device.id),
    ]);
  if (templateError) throw templateError;
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (!template) {
    throw new KioskApiError(
      "Frame yang dipilih tidak tersedia.",
      400,
      "KIOSK_TEMPLATE_INVALID",
    );
  }

  const assignedIds = (assignmentsResult.data ?? [])
    .map((item) => item.template_id)
    .filter((id): id is string => Boolean(id));
  const legacyAssignments = device.frame_templates ?? [];
  const isAssigned =
    assignedIds.length > 0
      ? assignedIds.includes(template.id)
      : legacyAssignments.length === 0 || legacyAssignments.includes(template.id);
  if (!isAssigned) {
    throw new KioskApiError(
      "Frame yang dipilih tidak terpasang pada device ini.",
      403,
      "KIOSK_TEMPLATE_NOT_ASSIGNED",
    );
  }

  const photoCount = Math.round(Number(template.photo_count));
  if (!Number.isFinite(photoCount) || photoCount < 1 || photoCount > 12) {
    throw new KioskApiError(
      "Jumlah photo slot pada frame tidak valid.",
      400,
      "KIOSK_TEMPLATE_PHOTO_SLOT_INVALID",
    );
  }

  return { id: template.id as string, photoCount };
}

async function findPricingProduct(
  context: KioskRequestContext,
  packageCode: string,
) {
  const { data: byId, error: idError } = await context.client
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,pricing_mode,photo_slot_price,photo_slot_promo_price,photo_slot_prices,print_limit,active,access_mode,requires_reprint_password,event_name,event_expires_at",
    )
    .eq("id", packageCode)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (idError) throw idError;
  if (byId) return byId as PricingProductRow;

  const { data: byName, error: nameError } = await context.client
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,pricing_mode,photo_slot_price,photo_slot_promo_price,photo_slot_prices,print_limit,active,access_mode,requires_reprint_password,event_name,event_expires_at",
    )
    .eq("name", packageCode)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (nameError) throw nameError;
  return (byName ?? null) as PricingProductRow | null;
}
