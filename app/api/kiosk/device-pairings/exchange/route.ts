import { exchangePublicDevicePairing } from "@/lib/kiosk/device-pairings";
import { jsonError, jsonOk } from "@/lib/kiosk/server";

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

    // Keep the exchange request fast. The kiosk loads its bootstrap through
    // the normal authenticated sync so the user can see the initialization
    // splash while configuration and assets are downloaded.
    return jsonOk({
      accessToken: credential.accessToken,
      // Device credentials are long-lived and revoked from the dashboard.
      // Returning the same value satisfies the existing kiosk refresh contract.
      refreshToken: credential.accessToken,
      expiresAt: null,
      pairingRequired: false,
      registeredDeviceId: credential.deviceId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
