import {
  buildKioskPairingSession,
  buildKioskBootstrap,
  createKioskAuthClient,
  jsonError,
  jsonOk,
  KioskApiError,
  resolveKioskContext,
} from "@/lib/kiosk/server";

type RefreshBody = {
  refreshToken?: string;
  deviceId?: string;
  hardwareId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RefreshBody;
    const refreshToken = body.refreshToken?.trim() ?? "";

    if (!refreshToken) {
      return jsonOk(
        {
          error: "Refresh token is required.",
          code: "KIOSK_REFRESH_TOKEN_REQUIRED",
        },
        { status: 400 },
      );
    }

    if (refreshToken.startsWith("pkd_")) {
      const context = await resolveKioskContext(refreshToken);
      const bootstrap = await buildKioskBootstrap(
        context,
        body.deviceId,
        body.hardwareId,
      );
      return jsonOk({
        accessToken: refreshToken,
        refreshToken,
        expiresAt: null,
        pairingRequired: false,
        ...bootstrap,
      });
    }

    const authClient = createKioskAuthClient();
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return jsonOk(
        {
          error: "The kiosk session can no longer be refreshed.",
          code: "KIOSK_REFRESH_FAILED",
        },
        { status: 401 },
      );
    }

    const context = await resolveKioskContext(data.session.access_token);
    let kioskPayload: Awaited<ReturnType<typeof buildKioskBootstrap>> | Awaited<
      ReturnType<typeof buildKioskPairingSession>
    >;
    try {
      kioskPayload = await buildKioskBootstrap(
        context,
        body.deviceId,
        body.hardwareId,
      );
    } catch (error) {
      if (
        error instanceof KioskApiError &&
        error.code === "KIOSK_DEVICE_PAIRING_REQUIRED"
      ) {
        kioskPayload = await buildKioskPairingSession(context);
      } else {
        throw error;
      }
    }

    return jsonOk({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
      ...kioskPayload,
    });
  } catch (error) {
    return jsonError(error);
  }
}
