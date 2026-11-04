"use client";

import { recordProductUsageEvent } from "@/server/actions/product-usage-actions";
import type { ProductUsageEventInput } from "@/types/product-usage";

const STORAGE_KEY = "poskart_product_usage_session";

function createFallbackSessionId() {
  return `web_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

export function getProductUsageSessionId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const sessionId =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : createFallbackSessionId();
    window.sessionStorage.setItem(STORAGE_KEY, sessionId);
    return sessionId;
  } catch {
    return createFallbackSessionId();
  }
}

export function trackProductUsageEvent(input: ProductUsageEventInput) {
  void recordProductUsageEvent({
    ...input,
    sessionId: input.sessionId ?? getProductUsageSessionId(),
  }).catch(() => {
    // Product analytics is deliberately best-effort.
  });
}
