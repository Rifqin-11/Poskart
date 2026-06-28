"use server";

import { createClient } from "@/lib/supabase/server";
import {
  PRINTER_TUNING_LIMITS,
  clampPrinterTuningValue,
} from "@/lib/printer-tuning";
import {
  assertSupabaseResult,
  mapBooth,
  normalizeAssignmentList,
  BOOTH_COLUMNS,
  type Device,
  type BoothInput,
  type BoothRow,
} from "../_shared/admin-types";

async function verifyAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getDevices(): Promise<Device[]> {
  const { supabase } = await verifyAuth();
  const { data, error } = await supabase
    .from("devices")
    .select(BOOTH_COLUMNS)
    .order("name", { ascending: true });

  return assertSupabaseResult(
    data as BoothRow[] | null,
    error,
    "Unable to load devices",
  ).map(mapBooth);
}

export async function createDevice(values: BoothInput): Promise<void> {
  const { supabase } = await verifyAuth();
  const id = `BTH-${Date.now()}`;
  const frameTemplates = normalizeAssignmentList(
    values.frameTemplates,
    values.template,
  );
  const pricingProfiles = normalizeAssignmentList(
    values.pricingProfiles,
    values.pricingProfile,
  );
  const { error } = await supabase.from("devices").insert({
    id,
    name: values.name,
    location: values.location,
    status: values.status,
    battery: values.battery,
    app_version: values.appVersion,
    last_sync: values.lastSync,
    theme: values.theme,
    template: frameTemplates[0] ?? "",
    pricing_profile: pricingProfiles[0] ?? "",
    frame_templates: frameTemplates,
    pricing_profiles: pricingProfiles,
    session_countdown_seconds: values.sessionCountdownSeconds ?? null,
    payment_countdown_seconds: values.paymentCountdownSeconds ?? null,
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
}

export async function updateDevice(
  id: string,
  patch: Partial<BoothInput>,
): Promise<void> {
  const { supabase } = await verifyAuth();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.location !== undefined) dbPatch.location = patch.location;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.battery !== undefined) dbPatch.battery = patch.battery;
  if (patch.appVersion !== undefined) dbPatch.app_version = patch.appVersion;
  if (patch.lastSync !== undefined) dbPatch.last_sync = patch.lastSync;
  if (patch.theme !== undefined) dbPatch.theme = patch.theme;
  if (patch.template !== undefined) dbPatch.template = patch.template;
  if (patch.frameTemplates !== undefined) {
    const frameTemplates = normalizeAssignmentList(
      patch.frameTemplates,
      patch.template,
    );
    dbPatch.frame_templates = frameTemplates;
    dbPatch.template = frameTemplates[0] ?? "";
  }
  if (patch.pricingProfile !== undefined)
    dbPatch.pricing_profile = patch.pricingProfile;
  if (patch.pricingProfiles !== undefined) {
    const pricingProfiles = normalizeAssignmentList(
      patch.pricingProfiles,
      patch.pricingProfile,
    );
    dbPatch.pricing_profiles = pricingProfiles;
    dbPatch.pricing_profile = pricingProfiles[0] ?? "";
  }
  if (patch.sessionCountdownSeconds !== undefined)
    dbPatch.session_countdown_seconds = patch.sessionCountdownSeconds ?? null;
  if (patch.paymentCountdownSeconds !== undefined)
    dbPatch.payment_countdown_seconds = patch.paymentCountdownSeconds ?? null;
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
}

export async function deleteDevice(id: string): Promise<void> {
  const { supabase } = await verifyAuth();
  const { error } = await supabase.from("devices").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete device: ${error.message}`);
}

export async function approveVoucherRequest(id: string, code = "FREE"): Promise<void> {
  const { supabase } = await verifyAuth();
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
  const { supabase } = await verifyAuth();
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
