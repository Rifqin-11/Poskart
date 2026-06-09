import {
  buildKioskBootstrap,
  jsonError,
  jsonOk,
  requireKioskContext,
} from "@/lib/kiosk/server";

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const searchParams = new URL(request.url).searchParams;
    const deviceId = searchParams.get("deviceId");
    const hardwareId = searchParams.get("hardwareId");
    return jsonOk(await buildKioskBootstrap(context, deviceId, hardwareId));
  } catch (error) {
    return jsonError(error);
  }
}
