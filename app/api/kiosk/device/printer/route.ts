import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import {
  PRINTER_TUNING_LIMITS,
  clampPrinterTuningValue,
} from "@/lib/printer-tuning";

type PrinterSettingsBody = {
  deviceId?: string;
  bottomSafeZoneMm?: number;
  brightness?: number;
  contrast?: number;
  dotDensity?: number;
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

    const patch = {
      printer_bottom_safe_zone_mm: clampPrinterTuningValue(
        body.bottomSafeZoneMm,
        Number(device.printer_bottom_safe_zone_mm ?? 0),
        PRINTER_TUNING_LIMITS.bottomSafeZoneMm.min,
        PRINTER_TUNING_LIMITS.bottomSafeZoneMm.max,
      ),
      printer_brightness: clampPrinterTuningValue(
        body.brightness,
        Number(device.printer_brightness ?? 0),
        PRINTER_TUNING_LIMITS.brightness.min,
        PRINTER_TUNING_LIMITS.brightness.max,
      ),
      printer_contrast: clampPrinterTuningValue(
        body.contrast,
        Number(device.printer_contrast ?? 0),
        PRINTER_TUNING_LIMITS.contrast.min,
        PRINTER_TUNING_LIMITS.contrast.max,
      ),
      printer_dot_density: clampPrinterTuningValue(
        body.dotDensity,
        Number(device.printer_dot_density ?? 1),
        PRINTER_TUNING_LIMITS.dotDensity.min,
        PRINTER_TUNING_LIMITS.dotDensity.max,
      ),
      updated_at: now,
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
