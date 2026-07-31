"use server";

import { getAdminContext, verifyRole } from "@/server/admin/context";
import { getPairingForAdminCode } from "@/lib/kiosk/device-pairings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PRINTER_TUNING_LIMITS,
  clampPrinterTuningValue,
} from "@/lib/printer-tuning";
import {
  assertSettingsPin,
  normalizeSettingsPin,
} from "@/lib/kiosk/settings-pin";
import type {
  DeviceErrorCategory,
  DeviceErrorGroup,
  DeviceErrorSeverity,
} from "@/types/device-error";
import {
  assertSupabaseResult,
  mapBooth,
  normalizeAssignmentList,
  BOOTH_COLUMNS,
  type Device,
  type BoothInput,
  type BoothRow,
} from "../_shared/admin-types";

export async function getDevices(): Promise<Device[]> {
  const { supabase } = await getAdminContext();
  const [{ data, error }, errorGroupsResult, layoutResult] = await Promise.all([
    supabase
      .from("devices")
      .select(BOOTH_COLUMNS)
      .order("name", { ascending: true }),
    supabase.rpc("get_device_error_open_counts"),
    supabase.from("layout_schemas").select("id,name"),
  ]);

  const devices = assertSupabaseResult(
    data as BoothRow[] | null,
    error,
    "Unable to load devices",
  ).map(mapBooth);
  const unresolvedByDevice = new Map<string, number>();
  if (layoutResult.error) {
    throw new Error(
      `Unable to load device layouts: ${layoutResult.error.message}`,
    );
  }
  const layoutNames = new Map(
    (layoutResult.data ?? []).map((layout) => [layout.id, layout.name]),
  );
  if (errorGroupsResult.error) {
    const missingTable =
      errorGroupsResult.error.code === "42P01" ||
      errorGroupsResult.error.code === "PGRST202" ||
      errorGroupsResult.error.code === "PGRST205";
    if (!missingTable) {
      throw new Error(
        `Unable to load device error counts: ${errorGroupsResult.error.message}`,
      );
    }
  } else {
    for (const row of errorGroupsResult.data ?? []) {
      const deviceId = typeof row.device_id === "string" ? row.device_id : "";
      if (!deviceId) continue;
      const count =
        typeof row.open_count === "number"
          ? row.open_count
          : Number(row.open_count);
      unresolvedByDevice.set(deviceId, Number.isFinite(count) ? count : 0);
    }
  }

  return devices.map((device) => ({
    ...device,
    theme: device.layoutSchemaId
      ? (layoutNames.get(device.layoutSchemaId) ?? device.theme)
      : device.theme,
    unresolvedErrorCount: unresolvedByDevice.get(device.id) ?? 0,
  }));
}

type DeviceErrorRow = {
  id: string;
  device_id: string;
  category: DeviceErrorCategory;
  severity: DeviceErrorSeverity;
  message: string;
  stack_trace: string | null;
  context: Record<string, unknown> | null;
  app_version: string | null;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved_at: string | null;
};

function mapDeviceError(row: DeviceErrorRow): DeviceErrorGroup {
  return {
    id: row.id,
    deviceId: row.device_id,
    category: row.category,
    severity: row.severity,
    message: row.message,
    stackTrace: row.stack_trace,
    context: row.context ?? {},
    appVersion: row.app_version,
    occurrenceCount: row.occurrence_count,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    resolvedAt: row.resolved_at,
  };
}

export async function getDeviceErrors(
  deviceId: string,
): Promise<DeviceErrorGroup[]> {
  const { supabase } = await getAdminContext();
  const normalizedDeviceId = deviceId.trim();
  if (!normalizedDeviceId) return [];

  const { data, error } = await supabase
    .from("device_error_groups")
    .select(
      "id, device_id, category, severity, message, stack_trace, context, app_version, occurrence_count, first_seen, last_seen, resolved_at",
    )
    .eq("device_id", normalizedDeviceId)
    .order("last_seen", { ascending: false })
    .limit(100);
  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST202" ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    throw new Error(`Unable to load device errors: ${error.message}`);
  }

  return ((data ?? []) as DeviceErrorRow[]).map(mapDeviceError);
}

export async function setDeviceErrorResolved(
  errorId: string,
  resolved: boolean,
): Promise<void> {
  const { supabase, user } = await verifyRole(["owner", "admin"]);
  const normalizedErrorId = errorId.trim();
  if (!normalizedErrorId) throw new Error("Device error is required.");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("device_error_groups")
    .update({
      resolved_at: resolved ? now : null,
      resolved_by: resolved ? user.id : null,
      updated_at: now,
    })
    .eq("id", normalizedErrorId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Unable to update device error: ${error.message}`);
  }
  if (!data) throw new Error("Device error not found or access was denied.");
}

export async function createDevice(values: BoothInput): Promise<void> {
  const { supabase, organizationId } = await verifyRole(["owner", "admin"]);
  const id = `BTH-${Date.now()}`;
  const frameTemplates = await resolveFrameTemplateAssignmentIds(
    supabase,
    organizationId,
    normalizeAssignmentList(values.frameTemplates, values.template),
  );
  const pricingProfiles = normalizeAssignmentList(
    values.pricingProfiles,
    values.pricingProfile,
  );
  const pricingProductIds = await resolvePricingProductAssignmentIds(
    supabase,
    pricingProfiles,
  );
  await assertPricingAssignmentModes(supabase, pricingProductIds);
  const layout = await resolveDeviceLayoutSchema(
    supabase,
    organizationId,
    values.layoutSchemaId ?? values.theme,
  );
  const settingsPin = normalizeSettingsPin(values.settingsPin);
  if (values.protectSettings && !settingsPin) {
    throw new Error(
      "Set a 4 to 12 digit Settings PIN before enabling protection.",
    );
  }
  if (settingsPin) assertSettingsPin(settingsPin);
  const { error } = await supabase.from("devices").insert({
    id,
    name: values.name,
    location: values.location,
    status: values.status,
    battery: values.battery,
    app_version: values.appVersion,
    last_sync: values.lastSync,
    theme: layout?.name ?? "",
    layout_schema_id: layout?.id ?? null,
    template: frameTemplates[0] ?? "",
    pricing_profile: pricingProductIds[0] ?? "",
    frame_templates: frameTemplates,
    frame_categories_enabled: values.frameCategoriesEnabled,
    pricing_profiles: pricingProductIds,
    session_countdown_seconds: values.sessionCountdownSeconds ?? null,
    payment_countdown_seconds: values.paymentCountdownSeconds ?? null,
    voucher_enabled: values.voucherEnabled,
    test_voucher_enabled: values.voucherEnabled && values.testVoucherEnabled,
    settings_pin: settingsPin,
    protect_settings: values.protectSettings && settingsPin.length > 0,
    printer_bottom_safe_zone_mm: clampPrinterTuningValue(
      values.printerBottomSafeZoneMm,
      0,
      PRINTER_TUNING_LIMITS.bottomSafeZoneMm.min,
      PRINTER_TUNING_LIMITS.bottomSafeZoneMm.max,
    ),
    printer_brightness: clampPrinterTuningValue(
      values.printerBrightness,
      0,
      PRINTER_TUNING_LIMITS.brightness.min,
      PRINTER_TUNING_LIMITS.brightness.max,
    ),
    printer_contrast: clampPrinterTuningValue(
      values.printerContrast,
      0,
      PRINTER_TUNING_LIMITS.contrast.min,
      PRINTER_TUNING_LIMITS.contrast.max,
    ),
    printer_dot_density: clampPrinterTuningValue(
      values.printerDotDensity,
      1,
      PRINTER_TUNING_LIMITS.dotDensity.min,
      PRINTER_TUNING_LIMITS.dotDensity.max,
    ),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to create device: ${error.message}`);
  await syncDeviceFrameTemplateAssignments(supabase, id, frameTemplates);
  await syncDevicePricingProductAssignments(supabase, id, pricingProductIds);
}

export type DevicePairingClaim = {
  pairingId: string;
  expiresAt: string;
  deviceId: string;
};

/**
 * Validates the short code and immediately creates the device with minimal
 * defaults so the kiosk can enter using its built-in config right away.
 * The admin configure modal still opens after this returns.
 */
export async function validateDevicePairingCode(
  code: string,
): Promise<DevicePairingClaim> {
  const { organizationId } = await verifyRole(["owner", "admin"]);
  const pairing = await getPairingForAdminCode(organizationId, code);

  const id = `BTH-${Date.now()}`;
  const { error } = await createSupabaseAdminClient().rpc(
    "complete_device_pairing",
    {
      p_pairing_id: pairing.id,
      p_organization_id: organizationId,
      p_device_id: id,
      p_device: {
        name: "New Kiosk",
        location: "",
        status: "online",
        battery: 100,
        appVersion: "",
        lastSync: new Date().toISOString(),
        theme: "",
        layoutSchemaId: null,
        template: "",
        pricingProfile: "",
        frameTemplates: [],
        frameCategoriesEnabled: false,
        pricingProfiles: [],
        sessionCountdownSeconds: null,
        paymentCountdownSeconds: null,
        voucherEnabled: false,
        testVoucherEnabled: false,
        settingsPin: "",
        protectSettings: false,
        printerBottomSafeZoneMm: 0,
        printerBrightness: 0,
        printerContrast: 0,
        printerDotDensity: 1,
      },
    },
  );
  if (error) throw new Error(`Unable to pair device: ${error.message}`);

  return {
    pairingId: pairing.id,
    expiresAt: pairing.expires_at,
    deviceId: id,
  };
}

/**
 * Creates the configured device and consumes its pairing request atomically.
 * The SQL function locks the pairing row, checks expiry/ownership, inserts the
 * device with its bound hardware ID, then marks the pairing configured.
 */
export async function createPairedDevice(
  pairingId: string,
  values: BoothInput,
): Promise<void> {
  const { supabase, organizationId } = await verifyRole(["owner", "admin"]);
  const normalizedPairingId = pairingId.trim();
  if (!normalizedPairingId) throw new Error("Pairing request is required.");

  const frameTemplates = await resolveFrameTemplateAssignmentIds(
    supabase,
    organizationId,
    normalizeAssignmentList(values.frameTemplates, values.template),
  );
  const pricingProfiles = normalizeAssignmentList(
    values.pricingProfiles,
    values.pricingProfile,
  );
  const pricingProductIds = await resolvePricingProductAssignmentIds(
    supabase,
    pricingProfiles,
  );
  await assertPricingAssignmentModes(supabase, pricingProductIds);
  const layout = await resolveDeviceLayoutSchema(
    supabase,
    organizationId,
    values.layoutSchemaId ?? values.theme,
  );

  const id = `BTH-${Date.now()}`;
  const { error } = await createSupabaseAdminClient().rpc(
    "complete_device_pairing",
    {
      p_pairing_id: normalizedPairingId,
      p_organization_id: organizationId,
      p_device_id: id,
      p_device: {
        name: values.name,
        location: values.location,
        status: values.status,
        battery: values.battery,
        appVersion: values.appVersion,
        lastSync: values.lastSync,
        theme: layout?.name ?? "",
        layoutSchemaId: layout?.id ?? "",
        template: frameTemplates[0] ?? "",
        pricingProfile: pricingProductIds[0] ?? "",
        frameTemplates,
        frameCategoriesEnabled: values.frameCategoriesEnabled,
        pricingProfiles: pricingProductIds,
        sessionCountdownSeconds: values.sessionCountdownSeconds ?? null,
        paymentCountdownSeconds: values.paymentCountdownSeconds ?? null,
        voucherEnabled: values.voucherEnabled,
        testVoucherEnabled: values.voucherEnabled && values.testVoucherEnabled,
        settingsPin: normalizeSettingsPin(values.settingsPin),
        protectSettings: values.protectSettings,
        printerBottomSafeZoneMm: clampPrinterTuningValue(
          values.printerBottomSafeZoneMm,
          0,
          PRINTER_TUNING_LIMITS.bottomSafeZoneMm.min,
          PRINTER_TUNING_LIMITS.bottomSafeZoneMm.max,
        ),
        printerBrightness: clampPrinterTuningValue(
          values.printerBrightness,
          0,
          PRINTER_TUNING_LIMITS.brightness.min,
          PRINTER_TUNING_LIMITS.brightness.max,
        ),
        printerContrast: clampPrinterTuningValue(
          values.printerContrast,
          0,
          PRINTER_TUNING_LIMITS.contrast.min,
          PRINTER_TUNING_LIMITS.contrast.max,
        ),
        printerDotDensity: clampPrinterTuningValue(
          values.printerDotDensity,
          1,
          PRINTER_TUNING_LIMITS.dotDensity.min,
          PRINTER_TUNING_LIMITS.dotDensity.max,
        ),
      },
    },
  );
  if (error) throw new Error(`Unable to pair device: ${error.message}`);
  await syncDeviceFrameTemplateAssignments(supabase, id, frameTemplates);
  await syncDevicePricingProductAssignments(supabase, id, pricingProductIds);
}

export async function updateDevice(
  id: string,
  patch: Partial<BoothInput>,
): Promise<void> {
  const { supabase, organizationId } = await verifyRole(["owner", "admin"]);
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.location !== undefined) dbPatch.location = patch.location;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.battery !== undefined) dbPatch.battery = patch.battery;
  if (patch.appVersion !== undefined) dbPatch.app_version = patch.appVersion;
  if (patch.lastSync !== undefined) dbPatch.last_sync = patch.lastSync;
  if (patch.layoutSchemaId !== undefined || patch.theme !== undefined) {
    const layout = await resolveDeviceLayoutSchema(
      supabase,
      organizationId,
      patch.layoutSchemaId ?? patch.theme ?? "",
    );
    dbPatch.layout_schema_id = layout?.id ?? null;
    dbPatch.theme = layout?.name ?? "";
  }
  let frameTemplates: string[] | null = null;
  if (patch.frameTemplates !== undefined || patch.template !== undefined) {
    frameTemplates = await resolveFrameTemplateAssignmentIds(
      supabase,
      organizationId,
      normalizeAssignmentList(patch.frameTemplates, patch.template),
    );
  }
  let pricingProductIds: string[] | null = null;
  if (
    patch.pricingProfiles !== undefined ||
    patch.pricingProfile !== undefined
  ) {
    const pricingProfiles = normalizeAssignmentList(
      patch.pricingProfiles,
      patch.pricingProfile,
    );
    pricingProductIds = await resolvePricingProductAssignmentIds(
      supabase,
      pricingProfiles,
    );
    await assertPricingAssignmentModes(supabase, pricingProductIds);
    dbPatch.pricing_profiles = pricingProductIds;
    dbPatch.pricing_profile = pricingProductIds[0] ?? "";
  }
  if (patch.sessionCountdownSeconds !== undefined)
    dbPatch.session_countdown_seconds = patch.sessionCountdownSeconds ?? null;
  if (patch.paymentCountdownSeconds !== undefined)
    dbPatch.payment_countdown_seconds = patch.paymentCountdownSeconds ?? null;
  if (patch.frameCategoriesEnabled !== undefined) {
    dbPatch.frame_categories_enabled = patch.frameCategoriesEnabled;
  }
  if (patch.voucherEnabled !== undefined) {
    dbPatch.voucher_enabled = patch.voucherEnabled;
    if (!patch.voucherEnabled) dbPatch.test_voucher_enabled = false;
  }
  if (patch.settingsPin !== undefined) {
    const settingsPin = normalizeSettingsPin(patch.settingsPin);
    // Blank input in the Configure dialog deliberately means "keep current PIN".
    if (settingsPin) dbPatch.settings_pin = assertSettingsPin(settingsPin);
  }
  if (patch.protectSettings !== undefined) {
    if (patch.protectSettings) {
      const candidatePin = normalizeSettingsPin(patch.settingsPin);
      if (!candidatePin) {
        const { data: device, error: deviceError } = await supabase
          .from("devices")
          .select("settings_pin")
          .eq("id", id)
          .maybeSingle();
        if (deviceError) {
          throw new Error(
            `Unable to validate Settings PIN: ${deviceError.message}`,
          );
        }
        if (!normalizeSettingsPin(device?.settings_pin)) {
          throw new Error(
            "Set a 4 to 12 digit Settings PIN before enabling protection.",
          );
        }
      }
    }
    dbPatch.protect_settings = patch.protectSettings;
  }
  if (patch.testVoucherEnabled !== undefined) {
    const voucherEnabled = patch.voucherEnabled;
    if (voucherEnabled === false) {
      dbPatch.test_voucher_enabled = false;
    } else if (voucherEnabled === true) {
      dbPatch.test_voucher_enabled = patch.testVoucherEnabled;
    } else {
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("voucher_enabled")
        .eq("id", id)
        .maybeSingle();
      if (deviceError) {
        throw new Error(
          `Unable to validate voucher settings: ${deviceError.message}`,
        );
      }
      dbPatch.test_voucher_enabled =
        device?.voucher_enabled === true && patch.testVoucherEnabled;
    }
  }
  if (patch.printerBottomSafeZoneMm !== undefined) {
    dbPatch.printer_bottom_safe_zone_mm = clampPrinterTuningValue(
      patch.printerBottomSafeZoneMm,
      0,
      PRINTER_TUNING_LIMITS.bottomSafeZoneMm.min,
      PRINTER_TUNING_LIMITS.bottomSafeZoneMm.max,
    );
  }
  if (patch.printerBrightness !== undefined) {
    dbPatch.printer_brightness = clampPrinterTuningValue(
      patch.printerBrightness,
      0,
      PRINTER_TUNING_LIMITS.brightness.min,
      PRINTER_TUNING_LIMITS.brightness.max,
    );
  }
  if (patch.printerContrast !== undefined) {
    dbPatch.printer_contrast = clampPrinterTuningValue(
      patch.printerContrast,
      0,
      PRINTER_TUNING_LIMITS.contrast.min,
      PRINTER_TUNING_LIMITS.contrast.max,
    );
  }
  if (patch.printerDotDensity !== undefined) {
    dbPatch.printer_dot_density = clampPrinterTuningValue(
      patch.printerDotDensity,
      1,
      PRINTER_TUNING_LIMITS.dotDensity.min,
      PRINTER_TUNING_LIMITS.dotDensity.max,
    );
  }

  const { error } = await supabase.from("devices").update(dbPatch).eq("id", id);
  if (error) throw new Error(`Unable to update device: ${error.message}`);
  if (frameTemplates) {
    await syncDeviceFrameTemplateAssignments(supabase, id, frameTemplates);
  }
  if (pricingProductIds) {
    await syncDevicePricingProductAssignments(supabase, id, pricingProductIds);
  }
}

async function resolveFrameTemplateAssignmentIds(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
  assignments: string[],
) {
  if (assignments.length === 0) return [];

  const uniqueAssignments = Array.from(new Set(assignments));
  const { data, error } = await supabase
    .from("templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("category", "frame")
    .in("id", uniqueAssignments);
  if (error) {
    throw new Error(`Unable to validate frame templates: ${error.message}`);
  }
  if ((data?.length ?? 0) !== uniqueAssignments.length) {
    throw new Error(
      "One or more selected frame templates are unavailable. Please select them again.",
    );
  }
  return assignments;
}

async function syncDeviceFrameTemplateAssignments(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  deviceId: string,
  templateIds: string[],
) {
  const { error } = await supabase.rpc("set_device_frame_templates", {
    target_device_id: deviceId,
    target_template_ids: templateIds,
  });
  if (error) {
    throw new Error(
      `Unable to save device frame assignments: ${error.message}`,
    );
  }
}

async function resolvePricingProductAssignmentIds(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  assignments: string[],
) {
  const normalizedAssignments = Array.from(
    new Set(assignments.map((assignment) => assignment.trim()).filter(Boolean)),
  );
  if (normalizedAssignments.length === 0) return [];

  const { data, error } = await supabase
    .from("pricing_products")
    .select("id,name");
  if (error) {
    throw new Error(`Unable to resolve pricing assignments: ${error.message}`);
  }

  return normalizedAssignments.map((assignment) => {
    const byId = (data ?? []).find((product) => product.id === assignment);
    if (byId) return byId.id;
    const byName = (data ?? []).filter(
      (product) => product.name === assignment,
    );
    if (byName.length === 1) return byName[0].id;
    if (byName.length > 1) {
      throw new Error(
        `Pricing name "${assignment}" is ambiguous. Select the package again.`,
      );
    }
    throw new Error(`Unknown pricing assignment: ${assignment}.`);
  });
}

async function syncDevicePricingProductAssignments(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  deviceId: string,
  pricingProductIds: string[],
) {
  const { error } = await supabase.rpc("set_device_pricing_products", {
    target_device_id: deviceId,
    target_pricing_product_ids: pricingProductIds,
  });
  if (error) {
    throw new Error(
      `Unable to save device pricing assignments: ${error.message}`,
    );
  }
}

async function resolveDeviceLayoutSchema(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
  value: string | null | undefined,
) {
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue) return null;

  const { data, error } = await supabase
    .from("layout_schemas")
    .select("id,name")
    .eq("organization_id", organizationId);
  if (error) {
    throw new Error(`Unable to resolve device layout: ${error.message}`);
  }

  const byId = (data ?? []).find((layout) => layout.id === normalizedValue);
  if (byId) return byId;
  const byName = (data ?? []).filter(
    (layout) => layout.name === normalizedValue,
  );
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    throw new Error(
      `Layout name "${normalizedValue}" is ambiguous. Select the theme again.`,
    );
  }
  throw new Error(`The selected device layout is unavailable.`);
}

async function assertPricingAssignmentModes(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  assignments: string[],
) {
  const normalizedAssignments = assignments
    .map((assignment) => assignment.trim())
    .filter(Boolean);
  if (normalizedAssignments.length === 0) {
    throw new Error("Assign a paid package or one active event to the device.");
  }

  const { data, error } = await supabase
    .from("pricing_products")
    .select("id,name,access_mode,active,event_expires_at");
  if (error)
    throw new Error(`Unable to validate pricing assignment: ${error.message}`);

  const products = (data ?? []).filter((product) =>
    normalizedAssignments.includes(product.id),
  );
  const unknownAssignments = normalizedAssignments.filter(
    (assignment) => !products.some((product) => product.id === assignment),
  );
  if (unknownAssignments.length > 0) {
    throw new Error(
      `Unknown pricing assignment: ${unknownAssignments.join(", ")}.`,
    );
  }

  const inactiveProducts = products.filter((product) => !product.active);
  if (inactiveProducts.length > 0) {
    throw new Error(
      `Inactive pricing cannot be assigned: ${inactiveProducts.map((product) => product.name).join(", ")}.`,
    );
  }

  const eventProducts = products.filter(
    (product) => product.access_mode === "event",
  );
  const paidProducts = products.filter(
    (product) => product.access_mode !== "event",
  );

  if (eventProducts.length > 1) {
    throw new Error("Assign only one Event access package to a device.");
  }
  const expiredEvent = eventProducts.find((product) => {
    if (!product.event_expires_at) return false;
    const expiryTime = Date.parse(product.event_expires_at);
    return Number.isFinite(expiryTime) && expiryTime <= Date.now();
  });
  if (expiredEvent) {
    throw new Error(`Event access "${expiredEvent.name}" has expired.`);
  }
  if (eventProducts.length > 0 && paidProducts.length > 0) {
    throw new Error(
      "A device cannot mix Event access and paid packages. Assign one access mode.",
    );
  }
}

export async function deleteDevice(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin"]);
  const { error } = await supabase.from("devices").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete device: ${error.message}`);
}

export async function approveVoucherRequest(
  id: string,
  code = "FREE",
): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const now = new Date().toISOString();
  const normalizedCode = code.trim().toUpperCase() || "FREE";
  const { error } = await supabase
    .from("devices")
    .update({
      voucher_command: normalizedCode,
      voucher_command_updated_at: now,
      voucher_requested_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(`Unable to approve voucher: ${error.message}`);
}

export async function rejectVoucherRequest(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase
    .from("devices")
    .update({
      voucher_requested_at: null,
      voucher_command: null,
      voucher_command_updated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Unable to reject voucher: ${error.message}`);
}
