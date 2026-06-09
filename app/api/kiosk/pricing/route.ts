import {
  buildKioskBootstrap,
  jsonError,
  jsonOk,
  requireKioskContext,
} from "@/lib/kiosk/server";

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const deviceId = new URL(request.url).searchParams.get("deviceId");
    const bootstrap = await buildKioskBootstrap(context, deviceId);
    return jsonOk({ pricingProducts: bootstrap.pricingProducts });
  } catch (error) {
    return jsonError(error);
  }
}
