export type PhotoPricingMode = "flat" | "per_photo_slot";

export type PhotoSlotPriceTier = {
  slotCount: number;
  price: number;
  promoPrice?: number;
};

export type PhotoPricingValues = {
  pricingMode: PhotoPricingMode;
  price: number;
  promoPrice?: number | null;
  photoSlotPrice?: number | null;
  photoSlotPromoPrice?: number | null;
  photoSlotPrices?: PhotoSlotPriceTier[] | null;
};

export type PhotoPricingQuote = {
  pricingMode: PhotoPricingMode;
  unitAmount: number;
  photoSlotCount: number | null;
  amount: number;
};

export function calculatePhotoPricingQuote(
  values: PhotoPricingValues,
  photoSlotCount?: number | null,
): PhotoPricingQuote {
  const pricingMode =
    values.pricingMode === "per_photo_slot" ? "per_photo_slot" : "flat";

  if (pricingMode === "flat") {
    const unitAmount = normalizeMoney(values.promoPrice ?? values.price);
    return {
      pricingMode,
      unitAmount,
      photoSlotCount: normalizePhotoSlotCount(photoSlotCount),
      amount: unitAmount,
    };
  }

  const normalizedPhotoSlotCount = normalizePhotoSlotCount(photoSlotCount);
  if (!normalizedPhotoSlotCount) {
    throw new Error(
      "Pilih frame terlebih dahulu untuk menghitung harga berdasarkan photo slot.",
    );
  }

  const tiers = normalizePhotoSlotPriceTiers(values.photoSlotPrices);
  const tier = tiers.find(
    (candidate) => candidate.slotCount === normalizedPhotoSlotCount,
  );
  const usesTierPricing = tiers.length > 0;
  const unitAmount = usesTierPricing
    ? normalizeMoney(tier?.promoPrice ?? tier?.price)
    : normalizeMoney(values.photoSlotPromoPrice ?? values.photoSlotPrice);
  if (unitAmount <= 0) {
    throw new Error("Harga per photo slot belum dikonfigurasi.");
  }

  if (usesTierPricing && !tier) {
    throw new Error(
      `Harga untuk frame ${normalizedPhotoSlotCount} photo slot belum dikonfigurasi.`,
    );
  }

  return {
    pricingMode,
    unitAmount,
    photoSlotCount: normalizedPhotoSlotCount,
    amount: usesTierPricing ? unitAmount : unitAmount * normalizedPhotoSlotCount,
  };
}

export function normalizePhotoSlotPriceTiers(
  value: unknown,
): PhotoSlotPriceTier[] {
  if (!Array.isArray(value)) return [];

  const tiers: PhotoSlotPriceTier[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    const slotCount = normalizePhotoSlotCount(
      source.slotCount ?? source.slot_count,
    );
    const price = normalizeMoney(source.price);
    const rawPromoPrice = source.promoPrice ?? source.promo_price;
    const promoPrice =
      rawPromoPrice == null ? undefined : normalizeMoney(rawPromoPrice);
    if (!slotCount || price <= 0) continue;
    tiers.push({ slotCount, price, promoPrice });
  }
  tiers.sort((a, b) => a.slotCount - b.slotCount);

  return tiers.filter(
    (tier, index) =>
      index === 0 || tier.slotCount !== tiers[index - 1]?.slotCount,
  );
}

function normalizeMoney(value: unknown) {
  const amount = Math.round(Number(value ?? 0));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function normalizePhotoSlotCount(value: unknown) {
  const count = Math.round(Number(value ?? 0));
  if (!Number.isFinite(count) || count < 1 || count > 12) return null;
  return count;
}
