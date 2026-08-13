import "server-only";

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import { builderPages, sanitizeLayoutSchema } from "@/lib/builder/schema";
import {
  applyAssetManifestDeliveryUrls,
  collectAssetUrls,
  getKioskAssetManifest,
} from "@/lib/assets/asset-manifest";
import {
  normalizeAssetReferences,
  normalizeAssetUrl,
} from "@/lib/assets/asset-url";
import { getPublicGalleryBaseUrl } from "@/lib/gallery/urls";
import { isSubscriptionActive } from "@/lib/subscription-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordServerError } from "@/server/observability/system-error-service";
import type { LayoutSchema } from "@/types/builder";

type OrganizationMembershipRow = {
  organization_id: string;
  role: "owner" | "admin" | "staff" | "designer";
};

export type KioskDeviceRow = {
  id: string;
  organization_id: string;
  hardware_id: string | null;
  name: string;
  location: string;
  status: "online" | "offline" | "maintenance";
  battery: number;
  app_version: string;
  last_sync: string;
  updated_at: string;
  layout_schema_id: string | null;
  theme: string;
  template: string;
  pricing_profile: string;
  frame_templates: string[] | null;
  frame_categories_enabled: boolean | null;
  pricing_profiles: string[] | null;
  session_countdown_seconds: number | null;
  payment_countdown_seconds: number | null;
  voucher_enabled: boolean;
  test_voucher_enabled: boolean;
  social_media_consent_enabled: boolean;
  email_delivery_enabled: boolean;
  settings_pin: string;
  protect_settings: boolean;
  printer_status: string;
  printer_name: string | null;
  printer_last_error: string | null;
  printer_status_updated_at: string | null;
  printer_bidirectional: boolean;
  printer_bottom_safe_zone_mm: number | null;
  printer_brightness: number | null;
  printer_contrast: number | null;
  printer_dot_density: number | null;
  paper_roll_type: string | null;
  paper_initial_length_mm: number | null;
  paper_used_length_mm: number | null;
  paper_installed_at: string | null;
  paper_updated_at: string | null;
  voucher_requested_at: string | null;
  voucher_command: string | null;
  voucher_command_updated_at: string | null;
};

function normalizeDeviceLocation(location: string) {
  const normalized = location.trim();
  if (normalized === "WAITING_VOUCHER" || normalized.startsWith("VOUCHER:")) {
    return "";
  }
  return location;
}

function sanitizeKioskDevice(device: KioskDeviceRow | null) {
  return device
    ? { ...device, location: normalizeDeviceLocation(device.location) }
    : null;
}

export type KioskRequestContext = {
  accessToken: string;
  user: User;
  organizationId: string;
  organizationRole: OrganizationMembershipRow["role"] | "kiosk";
  client: SupabaseClient;
  /** Present only for a credential created by the device pairing flow. */
  deviceTokenDeviceId?: string;
};

type DeviceAccessOptions = {
  /** Allows only an already-paid, recently started customer session to finish. */
  allowPaidSessionId?: string;
  /** Allows polling an already-created QRIS payment until it settles. */
  allowPendingPaymentSessionId?: string;
};

export class KioskApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "KIOSK_REQUEST_FAILED",
  ) {
    super(message);
  }
}

/**
 * The theme picker only needs enough schema to paint a faithful landing-page
 * thumbnail. Keeping the remaining pages out of this object avoids turning a
 * normal kiosk bootstrap into a download of every complete visual builder.
 */
function buildLayoutPreviewSchema(rawSchema: unknown): LayoutSchema | null {
  if (!rawSchema || typeof rawSchema !== "object") return null;

  const schema = sanitizeLayoutSchema(rawSchema as LayoutSchema);
  return {
    version: 1,
    canvas: schema.canvas,
    pages: Object.fromEntries(
      builderPages.map((page) => [
        page,
        page === "landing" ? schema.pages.landing ?? [] : [],
      ]),
    ) as LayoutSchema["pages"],
  };
}

function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new KioskApiError(
      "Kiosk authentication is not configured.",
      500,
      "KIOSK_AUTH_NOT_CONFIGURED",
    );
  }

  return { url, key };
}

export async function revokeKioskSession(accessToken: string) {
  const { url, key } = getSupabaseCredentials();
  const response = await fetch(`${url}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok && response.status !== 401) {
    throw new KioskApiError(
      "Unable to revoke the kiosk session.",
      502,
      "KIOSK_LOGOUT_FAILED",
    );
  }
}

export function createKioskAuthClient() {
  const { url, key } = getSupabaseCredentials();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createKioskUserClient(accessToken: string) {
  const { url, key } = getSupabaseCredentials();
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new KioskApiError(
      "Authentication token is required.",
      401,
      "KIOSK_TOKEN_REQUIRED",
    );
  }

  return token;
}

export async function requireKioskContext(
  request: Request,
): Promise<KioskRequestContext> {
  const accessToken = readBearerToken(request);
  return resolveKioskContext(accessToken);
}

export async function resolveKioskContext(
  accessToken: string,
): Promise<KioskRequestContext> {
  if (accessToken.startsWith("pkd_")) {
    return resolveDeviceTokenContext(accessToken);
  }
  const authClient = createKioskAuthClient();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  if (userError || !user) {
    throw new KioskApiError(
      "Your kiosk session is invalid or expired.",
      401,
      "KIOSK_SESSION_INVALID",
    );
  }

  const client = createKioskUserClient(accessToken);
  const { data: membership, error: membershipError } = await client
    .from("organization_members")
    .select("organization_id,role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new KioskApiError(
      `Unable to resolve organization: ${membershipError.message}`,
      500,
      "KIOSK_ORGANIZATION_LOOKUP_FAILED",
    );
  }

  const row = membership as OrganizationMembershipRow | null;
  if (!row?.organization_id) {
    throw new KioskApiError(
      "This account does not belong to an organization.",
      403,
      "KIOSK_ORGANIZATION_REQUIRED",
    );
  }

  return {
    accessToken,
    user,
    organizationId: row.organization_id,
    organizationRole: row.role,
    client,
  };
}

async function resolveDeviceTokenContext(
  accessToken: string,
): Promise<KioskRequestContext> {
  const match = /^pkd_([0-9a-f-]{36})\.([A-Za-z0-9_-]{32,})$/i.exec(
    accessToken,
  );
  if (!match) {
    throw new KioskApiError(
      "Your device credential is invalid.",
      401,
      "KIOSK_DEVICE_TOKEN_INVALID",
    );
  }

  const [, pairingId, secret] = match;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("device_pairings")
    .select(
      "organization_id,device_id,claimed_by_profile_id,status,device_token_revoked_at",
    )
    .eq("id", pairingId)
    .eq("device_token_hash", createHash("sha256").update(secret).digest("hex"))
    .eq("status", "configured")
    .is("device_token_revoked_at", null)
    .maybeSingle();
  if (error) {
    throw new KioskApiError(
      `Unable to validate device credential: ${error.message}`,
      500,
      "KIOSK_DEVICE_TOKEN_LOOKUP_FAILED",
    );
  }
  if (!data?.organization_id || !data.device_id) {
    throw new KioskApiError(
      "Your device credential is invalid or has been revoked.",
      401,
      "KIOSK_DEVICE_TOKEN_INVALID",
    );
  }

  return {
    accessToken,
    // A device identity cannot sign in to the dashboard. This fallback profile
    // ID is only used by legacy kiosk audit columns that require a user ID.
    user: {
      id: data.claimed_by_profile_id ?? data.device_id,
      email: "kiosk@poskart.my.id",
    } as User,
    organizationId: data.organization_id,
    organizationRole: "kiosk",
    client: admin,
    deviceTokenDeviceId: data.device_id,
  };
}

export async function requireOrganizationDevice(
  context: KioskRequestContext,
  deviceId: string,
  options: DeviceAccessOptions = {},
) {
  const normalizedId = deviceId.trim();
  if (!normalizedId) {
    throw new KioskApiError(
      "Device ID is required.",
      400,
      "KIOSK_DEVICE_REQUIRED",
    );
  }
  if (
    context.deviceTokenDeviceId &&
    context.deviceTokenDeviceId !== normalizedId
  ) {
    throw new KioskApiError(
      "This credential is restricted to another device.",
      403,
      "KIOSK_DEVICE_TOKEN_SCOPE_DENIED",
    );
  }

  const { data, error } = await context.client
    .from("devices")
    .select(
      "id,organization_id,hardware_id,name,location,status,battery,app_version,last_sync,updated_at,layout_schema_id,theme,template,pricing_profile,frame_templates,frame_categories_enabled,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,voucher_enabled,test_voucher_enabled,social_media_consent_enabled,email_delivery_enabled,settings_pin,protect_settings,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional,printer_bottom_safe_zone_mm,printer_brightness,printer_contrast,printer_dot_density,paper_roll_type,paper_initial_length_mm,paper_used_length_mm,paper_installed_at,paper_updated_at,voucher_requested_at,voucher_command,voucher_command_updated_at",
    )
    .eq("id", normalizedId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (error) {
    throw new KioskApiError(
      `Unable to load device: ${error.message}`,
      500,
      "KIOSK_DEVICE_LOOKUP_FAILED",
    );
  }

  if (!data) {
    throw new KioskApiError(
      "The selected device is not registered in this organization.",
      403,
      "KIOSK_DEVICE_NOT_ALLOWED",
    );
  }

  const device = data as KioskDeviceRow;
  await requireActiveKioskSubscription(context, {
    allowPaidSessionId: options.allowPaidSessionId,
    allowPendingPaymentSessionId: options.allowPendingPaymentSessionId,
    device,
  });
  return device;
}

/**
 * Enforces billing access at the server boundary for every device-scoped
 * kiosk operation. The Flutter lock screen is only a user experience layer;
 * uploads, payments, transactions, and printing must be rejected here too.
 */
export async function requireActiveKioskSubscription(
  context: KioskRequestContext,
  options: {
    allowPaidSessionId?: string;
    allowPendingPaymentSessionId?: string;
    device?: KioskDeviceRow;
  } = {},
) {
  const { data: subscription, error } = await context.client
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (error) {
    throw new KioskApiError(
      "Unable to verify the organization subscription.",
      500,
      "KIOSK_SUBSCRIPTION_CHECK_FAILED",
    );
  }

  if (isSubscriptionActive(subscription)) return;

  const sessionId = options.allowPaidSessionId?.trim() ?? "";
  const device = options.device;
  if (sessionId && device && (await isRecentPaidDeviceSession(context, device, sessionId))) {
    return;
  }

  const pendingPaymentSessionId = options.allowPendingPaymentSessionId?.trim() ?? "";
  if (
    pendingPaymentSessionId &&
    device &&
    (await isRecentDuitkuPayment(context, device, pendingPaymentSessionId))
  ) {
    return;
  }

  throw new KioskApiError(
    "The organization subscription is not active.",
    403,
    "KIOSK_SUBSCRIPTION_INACTIVE",
  );
}

async function isRecentPaidDeviceSession(
  context: KioskRequestContext,
  device: KioskDeviceRow,
  sessionId: string,
) {
  const { data, error } = await context.client
    .from("transactions")
    .select("status,paid_at,created_at")
    .eq("organization_id", context.organizationId)
    .eq("id", sessionId)
    .eq("booth", device.name)
    .maybeSingle();

  if (error) {
    throw new KioskApiError(
      "Unable to verify the paid customer session.",
      500,
      "KIOSK_SESSION_CHECK_FAILED",
    );
  }

  if (!data || (data.status !== "paid" && !data.paid_at)) return false;
  const completedAt = Date.parse(data.paid_at ?? data.created_at);
  const maximumSessionAgeMs = 2 * 60 * 60 * 1000;
  return Number.isFinite(completedAt) && Date.now() - completedAt <= maximumSessionAgeMs;
}

async function isRecentDuitkuPayment(
  context: KioskRequestContext,
  device: KioskDeviceRow,
  sessionId: string,
) {
  const { data, error } = await context.client
    .from("transactions")
    .select("status,provider,payment_gateway,created_at")
    .eq("organization_id", context.organizationId)
    .eq("id", sessionId)
    .eq("booth", device.name)
    .maybeSingle();

  if (error) {
    throw new KioskApiError(
      "Unable to verify the QRIS payment session.",
      500,
      "KIOSK_PAYMENT_SESSION_CHECK_FAILED",
    );
  }

  if (
    !data ||
    data.provider !== "QRIS" ||
    data.payment_gateway !== "duitku" ||
    !["pending", "paid"].includes(data.status)
  ) {
    return false;
  }
  const createdAt = Date.parse(data.created_at);
  const maximumPaymentAgeMs = 15 * 60 * 1000;
  return Number.isFinite(createdAt) && Date.now() - createdAt <= maximumPaymentAgeMs;
}

export async function listOrganizationDevices(context: KioskRequestContext) {
  let query = context.client
    .from("devices")
    .select(
      "id,organization_id,hardware_id,name,location,status,battery,app_version,last_sync,layout_schema_id,theme,template,pricing_profile,frame_templates,frame_categories_enabled,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,voucher_enabled,test_voucher_enabled,social_media_consent_enabled,email_delivery_enabled,settings_pin,protect_settings,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional,printer_bottom_safe_zone_mm,printer_brightness,printer_contrast,printer_dot_density,paper_roll_type,paper_initial_length_mm,paper_used_length_mm,paper_installed_at,paper_updated_at,voucher_requested_at,voucher_command,voucher_command_updated_at",
    )
    .eq("organization_id", context.organizationId);
  if (context.deviceTokenDeviceId) {
    query = query.eq("id", context.deviceTokenDeviceId);
  }
  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    throw new KioskApiError(
      `Unable to load devices: ${error.message}`,
      500,
      "KIOSK_DEVICES_LOOKUP_FAILED",
    );
  }

  return (data ?? []) as KioskDeviceRow[];
}

/**
 * Find an existing device by its hardware_id, or create a new one.
 * This allows the same physical device to map to the same DB row even after
 * the app is reinstalled (Android ID survives reinstall with the same signing key).
 */
/**
 * Resolves a previously paired physical device. Device creation deliberately
 * does not happen here: a new hardware ID must complete the web pairing flow.
 */
export async function requirePairedDeviceByHardwareId(
  context: KioskRequestContext,
  hardwareId: string,
): Promise<KioskDeviceRow> {
  const normalizedHwId = hardwareId.trim();
  if (!normalizedHwId) {
    throw new KioskApiError(
      "Hardware ID is required for device pairing.",
      400,
      "KIOSK_HARDWARE_ID_REQUIRED",
    );
  }

  // Service-role lookup is intentional here. RLS normally hides devices in
  // other organizations, but we must reject a physical kiosk that has already
  // been paired elsewhere instead of silently creating/moving it.
  const { data: existing, error: lookupError } =
    await createSupabaseAdminClient()
      .from("devices")
      .select(
        "id,organization_id,hardware_id,name,location,status,battery,app_version,last_sync,layout_schema_id,theme,template,pricing_profile,frame_templates,frame_categories_enabled,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,voucher_enabled,test_voucher_enabled,social_media_consent_enabled,email_delivery_enabled,settings_pin,protect_settings,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional,printer_bottom_safe_zone_mm,printer_brightness,printer_contrast,printer_dot_density,paper_roll_type,paper_initial_length_mm,paper_used_length_mm,paper_installed_at,paper_updated_at,voucher_requested_at,voucher_command,voucher_command_updated_at",
      )
      .eq("hardware_id", normalizedHwId)
      .maybeSingle();

  if (lookupError) {
    throw new KioskApiError(
      `Unable to look up device: ${lookupError.message}`,
      500,
      "KIOSK_DEVICE_LOOKUP_FAILED",
    );
  }

  if (!existing) {
    throw new KioskApiError(
      "Pair this new device from the POSKART web dashboard.",
      428,
      "KIOSK_DEVICE_PAIRING_REQUIRED",
    );
  }

  if (existing.organization_id !== context.organizationId) {
    throw new KioskApiError(
      "This physical device is already paired with another organization.",
      409,
      "KIOSK_DEVICE_REGISTERED_TO_OTHER_ORGANIZATION",
    );
  }
  if (
    context.deviceTokenDeviceId &&
    existing.id !== context.deviceTokenDeviceId
  ) {
    throw new KioskApiError(
      "This credential is restricted to another device.",
      403,
      "KIOSK_DEVICE_TOKEN_SCOPE_DENIED",
    );
  }

  return existing as KioskDeviceRow;
}

export async function buildKioskPairingSession(context: KioskRequestContext) {
  const { data: organization, error } = await context.client
    .from("organizations")
    .select("id,name,status,join_code,payment_collection_mode")
    .eq("id", context.organizationId)
    .single();

  if (error || !organization) {
    throw new KioskApiError(
      `Unable to load organization: ${error?.message ?? "not found"}`,
      500,
      "KIOSK_ORGANIZATION_LOOKUP_FAILED",
    );
  }

  return {
    pairingRequired: true,
    registeredDeviceId: null,
    user: {
      id: context.user.id,
      email: context.user.email ?? "",
    },
    organization: {
      ...organization,
      role: context.organizationRole,
    },
  };
}

export async function buildKioskBootstrap(
  context: KioskRequestContext,
  deviceId?: string | null,
  hardwareId?: string | null,
) {
  // Resolve the physical kiosk only after it has completed dashboard pairing.
  let device: KioskDeviceRow | null = null;
  // The hardware identifier is the pairing credential for a physical kiosk.
  // Prefer it over a locally cached device ID, which can belong to a prior
  // installation and otherwise blocks a newly-paired device from bootstrapping.
  if (hardwareId) {
    device = await requirePairedDeviceByHardwareId(context, hardwareId);
  } else if (deviceId) {
    device = await requireOrganizationDevice(context, deviceId);
  } else if (context.deviceTokenDeviceId) {
    device = await requireOrganizationDevice(
      context,
      context.deviceTokenDeviceId,
    );
  }

  const [
    organizationResult,
    subscriptionResult,
    configResult,
    layoutsResult,
    activeLayoutResult,
    deviceLayoutResult,
    themeResult,
    templatesResult,
    frameCategoriesResult,
    pricingResult,
    devices,
    voucherAllocationsResult,
    deviceFrameTemplatesResult,
    devicePricingProductsResult,
  ] = await Promise.all([
    context.client
      .from("organizations")
      .select("id,name,status,join_code,payment_collection_mode")
      .eq("id", context.organizationId)
      .single(),
    context.client
      .from("subscriptions")
      .select(
        "organization_id,plan_id,status,current_period_end,device_limit,subscription_plans(id,name,max_devices,features)",
      )
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
    context.client
      .from("app_configs")
      .select(
        "id,merchant_name,qris_payload_prefix,countdown_duration_seconds,flash_duration_ms,auto_return_duration_seconds,default_template_id,printer_name,booth_timeout_seconds,download_expiry_hours,watermark_enabled,maintenance_mode,qris_auto_retry,gallery_storage_provider",
      )
      .eq("id", "default")
      .maybeSingle(),
    context.client
      .from("layout_schemas")
      .select("id,name,schema,is_active,status,updated_at")
      .eq("organization_id", context.organizationId)
      .order("updated_at", { ascending: false }),
    context.client
      .from("layout_schemas")
      .select("id,name,schema,is_active,status,updated_at")
      .eq("organization_id", context.organizationId)
      .eq("is_active", true)
      .maybeSingle(),
    device?.layout_schema_id
      ? context.client
          .from("layout_schemas")
          .select("id,name,schema,is_active,status,updated_at")
          .eq("organization_id", context.organizationId)
          .eq("id", device.layout_schema_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    context.client
      .from("theme_presets")
      .select("id,name,schema,status,updated_at")
      .eq("organization_id", context.organizationId)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    context.client
      .from("templates")
      .select(
        "id,name,category,status,tagline,photo_count,accent_color,frame_category_id,frame_image_url,frame_layout,is_default,print_length_mm,display_order,usage_count",
      )
      .eq("organization_id", context.organizationId)
      .eq("status", "published")
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false }),
    context.client
      .from("frame_categories")
      .select("id,name,display_order")
      .eq("organization_id", context.organizationId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    context.client
      .from("pricing_products")
      .select(
        "id,name,price,promo_price,pricing_mode,photo_slot_price,photo_slot_promo_price,photo_slot_prices,print_limit,qris_download,live_photo_enabled,gif_enabled,active,access_mode,requires_reprint_password,event_name,event_expires_at",
      )
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("price", { ascending: true }),
    listOrganizationDevices(context),
    device
      ? context.client
          .from("voucher_allocations")
          .select(
            "id,version,voucher_campaigns(expires_at),voucher_codes(code,reusable,redemption_count,last_redeemed_at,created_at)",
          )
          .eq("organization_id", context.organizationId)
          .eq("device_id", device.id)
      : Promise.resolve({ data: [], error: null }),
    device
      ? context.client
          .from("device_frame_templates")
          .select("template_id")
          .eq("organization_id", context.organizationId)
          .eq("device_id", device.id)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    device
      ? context.client
          .from("device_pricing_products")
          .select("pricing_product_id")
          .eq("organization_id", context.organizationId)
          .eq("device_id", device.id)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queryError = [
    organizationResult.error,
    subscriptionResult.error,
    configResult.error,
    layoutsResult.error,
    deviceLayoutResult.error,
    themeResult.error,
    templatesResult.error,
    frameCategoriesResult.error,
    pricingResult.error,
    voucherAllocationsResult.error,
    deviceFrameTemplatesResult.error,
    devicePricingProductsResult.error,
  ].find(Boolean);

  if (queryError) {
    throw new KioskApiError(
      `Unable to build kiosk configuration: ${queryError.message}`,
      500,
      "KIOSK_CONFIG_FAILED",
    );
  }

  const subscription = subscriptionResult.data;
  const subscriptionStatus = subscription?.status ?? "free";
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : null;
  const paidPeriodExpired =
    ["active", "trialing"].includes(subscriptionStatus) &&
    periodEnd !== null &&
    periodEnd <= Date.now();

  if (
    ["past_due", "canceled", "free"].includes(subscriptionStatus) ||
    paidPeriodExpired
  ) {
    throw new KioskApiError(
      "The organization subscription is not active.",
      403,
      "KIOSK_SUBSCRIPTION_INACTIVE",
    );
  }

  const config = configResult.data;
  const layouts = layoutsResult.data ?? [];
  let layout = deviceLayoutResult.data ?? activeLayoutResult.data;
  if (!layout && layouts[0]?.id) {
    const fallbackLayout = await context.client
      .from("layout_schemas")
      .select("id,name,schema,is_active,status,updated_at")
      .eq("organization_id", context.organizationId)
      .eq("id", layouts[0].id)
      .maybeSingle();
    if (fallbackLayout.error) throw fallbackLayout.error;
    layout = fallbackLayout.data;
  }
  const assignedTemplateIds = (deviceFrameTemplatesResult.data ?? [])
    .map((assignment) => assignment.template_id)
    .filter((templateId): templateId is string => Boolean(templateId));
  // Fall back only for legacy devices that have not been backfilled yet.
  const assignedTemplates = new Set(
    assignedTemplateIds.length > 0
      ? assignedTemplateIds
      : (device?.frame_templates ?? []),
  );
  const assignedPricingProductIds = (devicePricingProductsResult.data ?? [])
    .map((assignment) => assignment.pricing_product_id)
    .filter((pricingProductId): pricingProductId is string =>
      Boolean(pricingProductId),
    );
  const assignedPricing = new Set(
    assignedPricingProductIds.length > 0
      ? assignedPricingProductIds
      : [
          ...(device?.pricing_profiles ?? []),
          ...(device?.pricing_profile ? [device.pricing_profile] : []),
        ],
  );

  const allTemplates = templatesResult.data ?? [];
  const normalizedLayoutSchema = layout?.schema
    ? normalizeAssetReferences(layout.schema)
    : null;
  const normalizedThemeSchema = themeResult.data?.schema
    ? normalizeAssetReferences(themeResult.data.schema)
    : null;
  const normalizedTemplates = allTemplates.map((template) => ({
    ...template,
    frame_image_url: normalizeAssetUrl(template.frame_image_url),
    frame_layout: normalizeAssetReferences(template.frame_layout),
  }));
  // When a device has specific templates assigned, only return those.
  // Otherwise return all published templates (backward compatible).
  const templates =
    assignedTemplates.size > 0
      ? normalizedTemplates.filter(
          (t) => assignedTemplates.has(t.id) || assignedTemplates.has(t.name),
        )
      : normalizedTemplates;
  const assignedFrameCategoryIds = new Set(
    templates
      .map((template) => template.frame_category_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );
  const frameCategories = (frameCategoriesResult.data ?? []).filter(
    (category) => assignedFrameCategoryIds.has(category.id),
  );
  const pricingProducts = (pricingResult.data ?? []).filter((product) => {
    if (assignedPricing.size === 0) {
      // Legacy devices without an explicit assignment may use paid packages,
      // but must never enter an event flow accidentally.
      return product.access_mode !== "event";
    }
    return assignedPricing.has(product.id) || assignedPricing.has(product.name);
  });
  const vouchers = (voucherAllocationsResult.data ?? []).flatMap(
    (allocation) => {
      const campaignRelation = allocation.voucher_campaigns as
        | { expires_at: string | null }
        | Array<{ expires_at: string | null }>
        | null;
      const campaign = Array.isArray(campaignRelation)
        ? (campaignRelation[0] ?? null)
        : campaignRelation;
      return (
        (allocation.voucher_codes ?? []) as Array<{
          code: string;
          reusable: boolean;
          redemption_count: number;
          last_redeemed_at: string | null;
          created_at: string;
        }>
      ).map((voucher) => ({
        code: voucher.code,
        reusable: voucher.reusable,
        usageCount: voucher.redemption_count,
        used: !voucher.reusable && voucher.redemption_count > 0,
        usedAt: voucher.last_redeemed_at,
        createdAt: voucher.created_at,
        expiresAt: campaign?.expires_at ?? null,
        allocationVersion: allocation.version,
        serverManaged: true,
      }));
    },
  );
  const assetReferences = collectAssetUrls({
    layoutSchema: normalizedLayoutSchema,
    designTokens: normalizedThemeSchema,
    templates,
  });
  const assetManifest = await getKioskAssetManifest(
    context.organizationId,
    assetReferences,
  );
  const deliveredLayoutSchema = applyAssetManifestDeliveryUrls(
    normalizedLayoutSchema,
    assetManifest,
  );
  const deliveredThemeSchema = applyAssetManifestDeliveryUrls(
    normalizedThemeSchema,
    assetManifest,
  );
  const deliveredTemplates = applyAssetManifestDeliveryUrls(
    templates,
    assetManifest,
  );

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    // Passed through to Flutter so the kiosk can enforce expiry offline.
    subscriptionEndsAt: subscriptionResult.data?.current_period_end ?? null,
    user: {
      id: context.user.id,
      email: context.user.email ?? "",
    },
    organization: {
      ...organizationResult.data,
      role: context.organizationRole,
    },
    subscription: subscriptionResult.data,
    device: sanitizeKioskDevice(device),
    availableDevices: devices.map((item) => sanitizeKioskDevice(item)),
    operationalSettings: config
      ? {
          merchantName: config.merchant_name,
          qrisPayloadPrefix: config.qris_payload_prefix,
          shareBaseUrl: getPublicGalleryBaseUrl(),
          countdownDurationSeconds: config.countdown_duration_seconds,
          flashDurationMs: config.flash_duration_ms,
          autoReturnDurationSeconds: config.auto_return_duration_seconds,
          defaultTemplateId: config.default_template_id ?? null,
          printerName: config.printer_name ?? null,
          boothTimeoutSeconds: config.booth_timeout_seconds ?? null,
          downloadExpiryHours: config.download_expiry_hours ?? null,
          watermarkEnabled: config.watermark_enabled ?? null,
          maintenanceMode: config.maintenance_mode ?? false,
          qrisAutoRetry: config.qris_auto_retry ?? null,
          galleryStorageProvider:
            config.gallery_storage_provider ?? "cloudinary",
        }
      : null,
    layoutSchema: deliveredLayoutSchema
      ? sanitizeLayoutSchema(deliveredLayoutSchema as LayoutSchema)
      : null,
    availableLayouts: layouts.map((l) => ({
      id: l.id,
      name: l.name,
      isActive: l.is_active,
      status: l.status,
      updatedAt: l.updated_at,
      // Flutter needs the selected layout schema not only for kiosk runtime,
      // but also when reopening the visual builder. Do not send every schema
      // here: the device's current layout is sufficient and avoids inflating
      // every bootstrap response as an organization grows.
      schema:
        l.id === layout?.id && deliveredLayoutSchema
          ? sanitizeLayoutSchema(deliveredLayoutSchema as LayoutSchema)
          : null,
      // Lightweight landing-page data for the Flutter theme picker. This is
      // intentionally separate from `schema`, which remains the full editable
      // schema of the layout currently assigned to this device.
      previewSchema: buildLayoutPreviewSchema(l.schema),
    })),
    assetManifest,
    designTokens: deliveredThemeSchema ?? null,
    templates: deliveredTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      frameCategoryId: template.frame_category_id ?? null,
      tagline: template.tagline ?? null,
      photoCount: template.photo_count,
      accentColor: template.accent_color,
      frameImageUrl: normalizeAssetUrl(template.frame_image_url),
      frameLayout: normalizeAssetReferences(template.frame_layout),
      isDefault: template.is_default,
      printLengthMm: Number(template.print_length_mm ?? 150),
      displayOrder: template.display_order,
      usageCount: template.usage_count ?? 0,
    })),
    availableTemplates: deliveredTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      frameCategoryId: template.frame_category_id ?? null,
      tagline: template.tagline ?? null,
      photoCount: template.photo_count,
      accentColor: template.accent_color,
      frameImageUrl: normalizeAssetUrl(template.frame_image_url),
      frameLayout: normalizeAssetReferences(template.frame_layout),
      isDefault: template.is_default,
      printLengthMm: Number(template.print_length_mm ?? 150),
      displayOrder: template.display_order,
      usageCount: template.usage_count ?? 0,
    })),
    frameCategories: frameCategories.map((category) => ({
      id: category.id,
      name: category.name,
      displayOrder: category.display_order,
    })),
    pricingProducts,
    // Device-scoped voucher allocation. Flutter caches these codes locally,
    // so voucher validation remains available while the kiosk is offline.
    vouchers,
    // The ID of the device resolved/registered for this session.
    // Flutter must persist this so subsequent API calls use the correct device.
    registeredDeviceId: device?.id ?? null,
  };
}

export function jsonError(error: unknown) {
  const apiError =
    error instanceof KioskApiError
      ? error
      : new KioskApiError(
          error instanceof Error
            ? error.message
            : "Unexpected kiosk API error.",
          500,
          "KIOSK_INTERNAL_ERROR",
        );

  const isInternal = apiError.code === "KIOSK_INTERNAL_ERROR";
  if (isInternal) {
    void recordServerError({
      error,
      source: "route",
      route: "kiosk-api",
      context: { code: apiError.code },
    });
  }

  return Response.json(
    {
      error: isInternal
        ? "Server POSKART sedang bermasalah. Coba lagi sebentar."
        : apiError.message,
      code: apiError.code,
    },
    {
      status: apiError.status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  const body = JSON.stringify(data);
  return new Response(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-POSKART-Response-Bytes": String(
        new TextEncoder().encode(body).byteLength,
      ),
      ...init?.headers,
    },
  });
}
