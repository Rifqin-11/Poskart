"use server";

import { requireSuperAdmin } from "@/server/admin/context";
import type {
  ProductUsageFunnel,
  ProductUsagePage,
  ProductUsagePairingError,
  SuperAdminProductUsageAnalytics,
} from "@/types/product-usage";

const EMPTY_FUNNEL: ProductUsageFunnel = {
  registered: 0,
  trialStarted: 0,
  onboardingCompleted: 0,
  devicePairingSuccess: 0,
  checkoutStarted: 0,
  firstTransactionCreated: 0,
  activeOrganizations: 0,
};

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeAnalytics(
  value: unknown,
  range: { from: string; to: string },
): SuperAdminProductUsageAnalytics {
  const payload = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const rawFunnel = payload.funnel && typeof payload.funnel === "object"
    ? (payload.funnel as Record<string, unknown>)
    : {};
  const rawPages = Array.isArray(payload.page_usage) ? payload.page_usage : [];
  const rawErrors = Array.isArray(payload.pairing_errors)
    ? payload.pairing_errors
    : [];

  const pageUsage: ProductUsagePage[] = rawPages.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const pagePath = text(row.page_path, "");
    return pagePath
      ? [{
          pagePath,
          uniqueOrganizations: count(row.unique_organizations),
          totalViews: count(row.total_views),
        }]
      : [];
  });

  const pairingErrors: ProductUsagePairingError[] = rawErrors.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [{
      errorCode: text(row.error_code, "UNKNOWN"),
      organizations: count(row.organizations),
      attempts: count(row.attempts),
    }];
  });

  return {
    range,
    funnel: {
      registered: count(rawFunnel.registered),
      trialStarted: count(rawFunnel.trial_started),
      onboardingCompleted: count(rawFunnel.onboarding_completed),
      devicePairingSuccess: count(rawFunnel.device_pairing_success),
      checkoutStarted: count(rawFunnel.checkout_started),
      firstTransactionCreated: count(rawFunnel.first_transaction_created),
      activeOrganizations: count(rawFunnel.active_organizations),
    },
    pageUsage,
    pairingErrors,
  };
}

export async function getSuperAdminProductUsageAnalytics(
  days = 30,
): Promise<SuperAdminProductUsageAnalytics> {
  const safeDays = Math.min(365, Math.max(1, Math.floor(Number(days) || 30)));
  const to = new Date();
  const from = new Date(to.getTime() - safeDays * 24 * 60 * 60 * 1000);
  const range = { from: from.toISOString(), to: to.toISOString() };

  try {
    const { supabase } = await requireSuperAdmin();
    const { data, error } = await supabase.rpc("get_product_usage_analytics", {
      p_from: range.from,
      p_to: range.to,
    });

    if (error) {
      if (["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code ?? "")) {
        return { range, funnel: EMPTY_FUNNEL, pageUsage: [], pairingErrors: [] };
      }
      throw new Error(`Unable to load product usage analytics: ${error.message}`);
    }

    return normalizeAnalytics(data, range);
  } catch (error) {
    if (error instanceof Error && error.message.includes("product_usage_events")) {
      return { range, funnel: EMPTY_FUNNEL, pageUsage: [], pairingErrors: [] };
    }
    throw error;
  }
}
