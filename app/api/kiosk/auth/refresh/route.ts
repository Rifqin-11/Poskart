import {
  buildKioskBootstrap,
  createKioskAuthClient,
  jsonError,
  jsonOk,
  resolveKioskContext,
} from "@/lib/kiosk/server";

type RefreshBody = {
  refreshToken?: string;
  deviceId?: string;
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
    const bootstrap = await buildKioskBootstrap(context, body.deviceId);

    return jsonOk({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
      ...bootstrap,
    });
  } catch (error) {
    return jsonError(error);
  }
}
