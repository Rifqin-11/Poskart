import {
  jsonError,
  jsonOk,
  KioskApiError,
  requireKioskContext,
} from "@/lib/kiosk/server";

/**
 * Lightweight device lease check used to revoke a kiosk session quickly after
 * an administrator deletes the device from the dashboard.
 *
 * Keep this endpoint intentionally smaller than the bootstrap endpoint: it
 * must not load themes, templates, pricing, or asset manifests.
 */
export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const deviceId = new URL(request.url).searchParams.get("deviceId")?.trim();

    if (!deviceId) {
      throw new KioskApiError(
        "Device ID is required.",
        400,
        "KIOSK_DEVICE_REQUIRED",
      );
    }

    const { data, error } = await context.client
      .from("devices")
      .select("id")
      .eq("id", deviceId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (error) {
      throw new KioskApiError(
        `Unable to validate device lease: ${error.message}`,
        500,
        "KIOSK_DEVICE_LEASE_FAILED",
      );
    }

    if (!data) {
      throw new KioskApiError(
        "The selected device is not registered in this organization.",
        403,
        "KIOSK_DEVICE_NOT_ALLOWED",
      );
    }

    return jsonOk({ active: true, deviceId: data.id });
  } catch (error) {
    return jsonError(error);
  }
}
