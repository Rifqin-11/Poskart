import {
  buildKioskBootstrap,
  createKioskAuthClient,
  jsonError,
  jsonOk,
  resolveKioskContext,
} from "@/lib/kiosk/server";

type LoginBody = {
  email?: string;
  password?: string;
  deviceId?: string;
  hardwareId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return jsonOk(
        {
          error: "Email and password are required.",
          code: "KIOSK_CREDENTIALS_REQUIRED",
        },
        { status: 400 },
      );
    }

    const authClient = createKioskAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return jsonOk(
        {
          error: "Email or password is incorrect.",
          code: "KIOSK_LOGIN_FAILED",
        },
        { status: 401 },
      );
    }

    const context = await resolveKioskContext(data.session.access_token);
    const bootstrap = await buildKioskBootstrap(
      context,
      body.deviceId,     // legacy: deviceId already stored on device
      body.hardwareId,   // new: Android hardware ID for auto-registration
      email,             // used as fallback device name on first register
    );

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
