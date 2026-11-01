import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import {
  PRINTER_PRESETS,
  PRINTER_TUNING_LIMITS,
  clampPrinterTuningValue,
  normalizePrinterPreset,
} from "@/lib/printer-tuning";

type PrinterSettingsBody = {
  deviceId?: string;
  bottomSafeZoneMm?: number;
  brightness?: number;
  contrast?: number;
  dotDensity?: number;
  shadowLift?: number;
  darkSmoothing?: number;
  localContrast?: number;
  backgroundLift?: number;
  preset?: string;
  sharpness?: number;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as PrinterSettingsBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const now = new Date().toISOString();
    const preset = normalizePrinterPreset(body.preset ?? device.printer_preset);
    const presetValues = preset === "advanced" ? null : PRINTER_PRESETS[preset];

    const patch = {
      printer_bottom_safe_zone_mm: clampPrinterTuningValue(
        body.bottomSafeZoneMm,
        Number(device.printer_bottom_safe_zone_mm ?? 0),
        PRINTER_TUNING_LIMITS.bottomSafeZoneMm.min,
        PRINTER_TUNING_LIMITS.bottomSafeZoneMm.max,
      ),
      printer_preset: preset,
      printer_brightness: clampPrinterTuningValue(
        presetValues?.brightness ?? body.brightness,
        Number(device.printer_brightness ?? 0),
        PRINTER_TUNING_LIMITS.brightness.min,
        PRINTER_TUNING_LIMITS.brightness.max,
      ),
      printer_contrast: clampPrinterTuningValue(
        presetValues?.contrast ?? body.contrast,
        Number(device.printer_contrast ?? 0),
        PRINTER_TUNING_LIMITS.contrast.min,
        PRINTER_TUNING_LIMITS.contrast.max,
      ),
      printer_dot_density: clampPrinterTuningValue(
        presetValues?.dotDensity ?? body.dotDensity,
        Number(device.printer_dot_density ?? 1),
        PRINTER_TUNING_LIMITS.dotDensity.min,
        PRINTER_TUNING_LIMITS.dotDensity.max,
      ),
      printer_sharpness: clampPrinterTuningValue(
        presetValues?.sharpness ?? body.sharpness,
        Number(device.printer_sharpness ?? 20),
        0,
        100,
      ),
      updated_at: now,
      printer_dark_smoothing: clampPrinterTuningValue(presetValues?.darkSmoothing ?? body.darkSmoothing, Number(device.printer_dark_smoothing ?? 0), 0, 100),
      printer_local_contrast: clampPrinterTuningValue(presetValues?.localContrast ?? body.localContrast, Number(device.printer_local_contrast ?? 0), 0, 100),
      printer_background_lift: clampPrinterTuningValue(presetValues?.backgroundLift ?? body.backgroundLift, Number(device.printer_background_lift ?? 0), 0, 100),
      // Older kiosks omit this field: retain the current manual adjustment.
      printer_shadow_lift: clampPrinterTuningValue(
        body.shadowLift,
        Number(device.printer_shadow_lift ?? 0),
        PRINTER_TUNING_LIMITS.shadowLift.min,
        PRINTER_TUNING_LIMITS.shadowLift.max,
      ),
    };

    const { error } = await context.client
      .from("devices")
      .update(patch)
      .eq("id", device.id)
      .eq("organization_id", context.organizationId);

    if (error) throw error;
    return jsonOk({ success: true, printer: patch });
  } catch (error) {
    return jsonError(error);
  }
}
