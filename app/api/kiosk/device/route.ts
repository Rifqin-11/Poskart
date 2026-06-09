import {
  jsonError,
  jsonOk,
  listOrganizationDevices,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const deviceId = new URL(request.url).searchParams.get("deviceId");

    if (deviceId) {
      return jsonOk({
        device: await requireOrganizationDevice(context, deviceId),
      });
    }

    return jsonOk({
      devices: await listOrganizationDevices(context),
    });
  } catch (error) {
    return jsonError(error);
  }
}
