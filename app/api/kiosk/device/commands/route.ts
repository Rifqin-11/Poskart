import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

/**
 * Small command endpoint for an already-configured kiosk.
 *
 * It deliberately avoids buildKioskBootstrap(), asset manifests, templates,
 * and pricing. The payment screen only needs to know whether an admin has
 * approved a voucher command for this device.
 */
export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const deviceId = new URL(request.url).searchParams.get("deviceId") ?? "";
    const device = await requireOrganizationDevice(context, deviceId);

    return jsonOk({
      voucherCommand: device.voucher_command?.trim() || null,
      voucherCommandUpdatedAt: device.voucher_command_updated_at ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
