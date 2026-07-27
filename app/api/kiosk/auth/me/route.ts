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
    return jsonOk(
      await buildKioskBootstrap(
        context,
        searchParams.get("deviceId"),
        searchParams.get("hardwareId"),
      ),
    );
  } catch (error) {
    return jsonError(error);
  }
}
