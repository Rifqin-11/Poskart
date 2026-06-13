import "server-only";

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import { sanitizeLayoutSchema } from "@/lib/builder/schema";
import { getPublicGalleryBaseUrl } from "@/lib/gallery/urls";
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
  theme: string;
  template: string;
  pricing_profile: string;
  frame_templates: string[] | null;
  pricing_profiles: string[] | null;
  session_countdown_seconds: number | null;
  payment_countdown_seconds: number | null;
  printer_status: string;
  printer_name: string | null;
  printer_last_error: string | null;
  printer_status_updated_at: string | null;
  printer_bidirectional: boolean;
};

export type KioskRequestContext = {
  accessToken: string;
  user: User;
  organizationId: string;
  organizationRole: OrganizationMembershipRow["role"];
  client: SupabaseClient;
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

export async function requireOrganizationDevice(
  context: KioskRequestContext,
  deviceId: string,
) {
  const normalizedId = deviceId.trim();
  if (!normalizedId) {
    throw new KioskApiError(
      "Device ID is required.",
      400,
      "KIOSK_DEVICE_REQUIRED",
    );
  }

  const { data, error } = await context.client
    .from("devices")
    .select(
      "id,organization_id,hardware_id,name,location,status,battery,app_version,last_sync,theme,template,pricing_profile,frame_templates,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional",
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

  return data as KioskDeviceRow;
}

export async function listOrganizationDevices(context: KioskRequestContext) {
  const { data, error } = await context.client
    .from("devices")
    .select(
      "id,organization_id,hardware_id,name,location,status,battery,app_version,last_sync,theme,template,pricing_profile,frame_templates,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional",
    )
    .eq("organization_id", context.organizationId)
    .order("name", { ascending: true });

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
export async function upsertDeviceByHardwareId(
  context: KioskRequestContext,
  hardwareId: string,
  userEmail: string,
): Promise<KioskDeviceRow> {
  const normalizedHwId = hardwareId.trim();
  if (!normalizedHwId) {
    throw new KioskApiError(
      "Hardware ID is required for device registration.",
      400,
      "KIOSK_HARDWARE_ID_REQUIRED",
    );
  }

  // 1. Check if device already exists for this org + hardware_id
  const { data: existing, error: lookupError } = await context.client
    .from("devices")
    .select(
      "id,organization_id,hardware_id,name,location,status,battery,app_version,last_sync,theme,template,pricing_profile,frame_templates,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional",
    )
    .eq("organization_id", context.organizationId)
    .eq("hardware_id", normalizedHwId)
    .maybeSingle();

  if (lookupError) {
    throw new KioskApiError(
      `Unable to look up device: ${lookupError.message}`,
      500,
      "KIOSK_DEVICE_LOOKUP_FAILED",
    );
  }

  if (existing) {
    return existing as KioskDeviceRow;
  }

  // 2. No existing device — register a new one
  const newId = `BTH-${Date.now()}`;
  const deviceName = `Booth (${userEmail})`;
  const now = new Date().toISOString();

  const { error: insertError } = await context.client.from("devices").insert({
    id: newId,
    organization_id: context.organizationId,
    hardware_id: normalizedHwId,
    name: deviceName,
    location: "",
    status: "online",
    battery: 0,
    app_version: "",
    last_sync: now,
    theme: "",
    template: "",
    pricing_profile: "",
    frame_templates: [],
    pricing_profiles: [],
    updated_at: now,
  });

  if (insertError) {
    throw new KioskApiError(
      `Unable to register device: ${insertError.message}`,
      500,
      "KIOSK_DEVICE_REGISTER_FAILED",
    );
  }

  // Return the freshly inserted row
  const { data: fresh, error: refetchError } = await context.client
    .from("devices")
    .select(
      "id,organization_id,hardware_id,name,location,status,battery,app_version,last_sync,theme,template,pricing_profile,frame_templates,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional",
    )
    .eq("id", newId)
    .single();

  if (refetchError || !fresh) {
    throw new KioskApiError(
      "Device registered but could not be retrieved.",
      500,
      "KIOSK_DEVICE_REFETCH_FAILED",
    );
  }

  return fresh as KioskDeviceRow;
}

export async function buildKioskBootstrap(
  context: KioskRequestContext,
  deviceId?: string | null,
  hardwareId?: string | null,
  userEmail?: string,
) {
  // Resolve the device: prefer explicit deviceId, then upsert by hardwareId
  let device: KioskDeviceRow | null = null;
  if (deviceId) {
    device = await requireOrganizationDevice(context, deviceId);
  } else if (hardwareId) {
    device = await upsertDeviceByHardwareId(
      context,
      hardwareId,
      userEmail ?? context.user.email ?? "unknown",
    );
  }

  const [
    organizationResult,
    subscriptionResult,
    configResult,
    layoutsResult,
    themeResult,
    templatesResult,
    pricingResult,
    devices,
  ] = await Promise.all([
    context.client
      .from("organizations")
      .select("id,name,status,join_code")
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
      .select("*")
      .eq("id", "default")
      .maybeSingle(),
    context.client
      .from("layout_schemas")
      .select("id,name,schema,is_active,status,updated_at")
      .eq("organization_id", context.organizationId)
      .order("updated_at", { ascending: false }),
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
        "id,name,category,status,tagline,photo_count,accent_color,frame_image_url,frame_layout,is_default,display_order,usage_count",
      )
      .eq("organization_id", context.organizationId)
      .eq("status", "published")
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false }),
    context.client
      .from("pricing_products")
      .select(
        "id,name,price,promo_price,print_limit,qris_download,gif_enabled,active",
      )
      .eq("active", true)
      .order("price", { ascending: true }),
    listOrganizationDevices(context),
  ]);

  const queryError = [
    organizationResult.error,
    subscriptionResult.error,
    configResult.error,
    layoutsResult.error,
    themeResult.error,
    templatesResult.error,
    pricingResult.error,
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
    ["past_due", "canceled"].includes(subscriptionStatus) ||
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
  const layout = layouts.find((l) => l.is_active) ?? layouts[0] ?? null;
  const assignedTemplates = new Set(device?.frame_templates ?? []);
  const assignedPricing = new Set(device?.pricing_profiles ?? []);

  const allTemplates = templatesResult.data ?? [];
  // When a device has specific templates assigned, only return those.
  // Otherwise return all published templates (backward compatible).
  const templates =
    assignedTemplates.size > 0
      ? allTemplates.filter(
          (t) => assignedTemplates.has(t.id) || assignedTemplates.has(t.name),
        )
      : allTemplates;
  const pricingProducts = (pricingResult.data ?? []).filter(
    (product) =>
      assignedPricing.size === 0 ||
      assignedPricing.has(product.id) ||
      assignedPricing.has(product.name),
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    user: {
      id: context.user.id,
      email: context.user.email ?? "",
    },
    organization: {
      ...organizationResult.data,
      role: context.organizationRole,
    },
    subscription: subscriptionResult.data,
    device,
    availableDevices: devices,
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
        }
      : null,
    layoutSchema: layout?.schema
      ? sanitizeLayoutSchema(layout.schema as LayoutSchema)
      : null,
    availableLayouts: layouts.map((l) => ({
      id: l.id,
      name: l.name,
      isActive: l.is_active,
      status: l.status,
      updatedAt: l.updated_at,
      schema: l.schema,
    })),
    designTokens: themeResult.data?.schema ?? null,
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      tagline: template.tagline ?? null,
      photoCount: template.photo_count,
      accentColor: template.accent_color,
      frameImageUrl: template.frame_image_url ?? null,
      frameLayout: template.frame_layout ?? null,
      isDefault: template.is_default,
      displayOrder: template.display_order,
      usageCount: template.usage_count ?? 0,
    })),
    availableTemplates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      tagline: template.tagline ?? null,
      photoCount: template.photo_count,
      accentColor: template.accent_color,
      frameImageUrl: template.frame_image_url ?? null,
      frameLayout: template.frame_layout ?? null,
      isDefault: template.is_default,
      displayOrder: template.display_order,
      usageCount: template.usage_count ?? 0,
    })),
    pricingProducts,
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

  return Response.json(
    {
      error: apiError.message,
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
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}
