"use server";

import { recordAuthenticatedProductUsageEvent } from "@/server/product-usage";
import type { ProductUsageEventInput } from "@/types/product-usage";

export async function recordProductUsageEvent(input: ProductUsageEventInput) {
  await recordAuthenticatedProductUsageEvent(input);
  return { ok: true as const };
}
