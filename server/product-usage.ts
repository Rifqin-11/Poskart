import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminProfileRole,
  getAdminMembership,
  getOptionalAdminContext,
} from "@/server/admin/context";
import {
  PRODUCT_USAGE_EVENT_NAMES,
  PRODUCT_USAGE_SOURCES,
  type ProductUsageEventInput,
  type ProductUsageEventName,
  type ProductUsageMetadata,
  type ProductUsageSource,
} from "@/types/product-usage";

const EVENT_METADATA_KEYS: Record<ProductUsageEventName, readonly string[]> = {
  page_viewed: ["source"],
  signup_completed: ["provider"],
  trial_started: ["already_active"],
  onboarding_completed: ["path"],
  device_pairing_started: ["surface"],
  device_pairing_success: ["surface"],
  device_pairing_failed: ["surface"],
  pricing_viewed: ["surface"],
  checkout_started: ["plan_id", "device_count"],
  first_transaction_created: ["source"],
};

const SOURCE_SET = new Set<string>(PRODUCT_USAGE_SOURCES);
const EVENT_NAME_SET = new Set<string>(PRODUCT_USAGE_EVENT_NAMES);
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,100}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProductUsageRow = {
  organization_id: string | null;
  user_id: string | null;
  event_name: ProductUsageEventName;
  page_path: string | null;
  session_id: string | null;
  source: ProductUsageSource;
  success: boolean | null;
  error_code: string | null;
  metadata: ProductUsageMetadata;
};

function normalizePagePath(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value, "https://poskart.invalid");
    const path = url.pathname.trim();
    if (!path.startsWith("/")) return null;
    return path.slice(0, 200) || "/";
  } catch {
    return null;
  }
}

function normalizeSessionId(value: string | null | undefined) {
  const sessionId = value?.trim() ?? "";
  return SESSION_ID_PATTERN.test(sessionId) || UUID_PATTERN.test(sessionId)
    ? sessionId.slice(0, 100)
    : null;
}

function normalizeSource(value: ProductUsageSource | undefined) {
  return value && SOURCE_SET.has(value) ? value : "admin";
}

function normalizeErrorCode(value: string | null | undefined) {
  const code = value?.trim().toUpperCase() ?? "";
  if (!code || !/^[A-Z0-9_:-]{1,64}$/.test(code)) return null;
  return code;
}

function normalizeMetadata(
  eventName: ProductUsageEventName,
  metadata: Record<string, unknown> | undefined,
): ProductUsageMetadata {
  const allowedKeys = new Set(EVENT_METADATA_KEYS[eventName]);
  const safeMetadata: ProductUsageMetadata = {};

  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (!allowedKeys.has(key)) continue;
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean" &&
      value !== null
    ) {
      continue;
    }

    if (typeof value === "string") {
      const normalized = value.trim().slice(0, 120);
      if (normalized) safeMetadata[key] = normalized;
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) safeMetadata[key] = value;
    } else if (value !== null) {
      safeMetadata[key] = value;
    }
  }

  return safeMetadata;
}

function normalizeInput(input: ProductUsageEventInput): Omit<ProductUsageRow, "organization_id" | "user_id"> | null {
  if (!EVENT_NAME_SET.has(input.eventName)) return null;

  const eventName = input.eventName;
  return {
    event_name: eventName,
    page_path: normalizePagePath(input.pagePath),
    session_id: normalizeSessionId(input.sessionId),
    source: normalizeSource(input.source),
    success: typeof input.success === "boolean" ? input.success : null,
    error_code: normalizeErrorCode(input.errorCode),
    metadata: normalizeMetadata(eventName, input.metadata),
  };
}

async function insertProductUsageEvent(
  client: SupabaseClient,
  row: ProductUsageRow,
) {
  let error;
  try {
    ({ error } = await client.from("product_usage_events").insert(row));
  } catch (insertError) {
    console.error("[product-usage] Failed to record event", insertError);
    return;
  }

  // Analytics must never turn a successful product action into a user-facing
  // error. A missing migration is also handled this way during deployment.
  if (error && !["23505", "42P01", "PGRST202", "PGRST205"].includes(error.code ?? "")) {
    console.error("[product-usage] Failed to record event", {
      eventName: row.event_name,
      code: error.code,
      message: error.message,
    });
  }
}

export async function recordAuthenticatedProductUsageEvent(
  input: ProductUsageEventInput,
) {
  try {
    const normalized = normalizeInput(input);
    if (!normalized) return;

    const context = await getOptionalAdminContext();
    if (!context) return;

    const [membership, profileRole] = await Promise.all([
      getAdminMembership(),
      getAdminProfileRole(),
    ]);
    await insertProductUsageEvent(createSupabaseAdminClient(), {
      ...normalized,
      // Platform Super Admin activity must not be counted as customer usage,
      // even when that account also has an organization membership.
      organization_id:
        profileRole === "admin" ? null : membership?.organizationId ?? null,
      user_id: context.user.id,
    });
  } catch (error) {
    console.error("[product-usage] Collector failed", error);
  }
}

export async function recordOrganizationProductUsageEvent(input: {
  organizationId: string;
  userId?: string | null;
  event: ProductUsageEventInput;
}) {
  try {
    const normalized = normalizeInput(input.event);
    if (!normalized || !input.organizationId.trim()) return;

    await insertProductUsageEvent(createSupabaseAdminClient(), {
      ...normalized,
      organization_id: input.organizationId.trim(),
      user_id: input.userId ?? null,
    });
  } catch (error) {
    console.error("[product-usage] Organization collector failed", error);
  }
}

export async function recordSignupCompleted(input: {
  userId?: string | null;
  sessionId?: string | null;
  provider?: "email" | "google";
}) {
  try {
    const normalized = normalizeInput({
      eventName: "signup_completed",
      sessionId: input.sessionId,
      source: "auth",
      metadata: { provider: input.provider ?? "email" },
    });
    if (!normalized) return;

    await insertProductUsageEvent(createSupabaseAdminClient(), {
      ...normalized,
      organization_id: null,
      user_id: input.userId ?? null,
    });
  } catch (error) {
    console.error("[product-usage] Signup collector failed", error);
  }
}
