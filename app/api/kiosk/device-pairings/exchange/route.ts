import { exchangePublicDevicePairing } from "@/lib/kiosk/device-pairings";
import {
  buildKioskBootstrap,
  jsonError,
  jsonOk,
  resolveKioskContext,
} from "@/lib/kiosk/server";

type ExchangeBody = {
  pairingId?: string;
  pollingSecret?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExchangeBody;
    const credential = await exchangePublicDevicePairing(
      body.pairingId ?? "",
      body.pollingSecret ?? "",
    );
    const context = await resolveKioskContext(credential.accessToken);
    const bootstrap = await buildKioskBootstrap(context, credential.deviceId);
    return jsonOk({
      accessToken: credential.accessToken,
      // Device credentials are long-lived and revoked from the dashboard.
      // Returning the same value satisfies the existing kiosk refresh contract.
      refreshToken: credential.accessToken,
      expiresAt: null,
      pairingRequired: false,
      ...bootstrap,
    });
  } catch (error) {
    return jsonError(error);
  }
}
