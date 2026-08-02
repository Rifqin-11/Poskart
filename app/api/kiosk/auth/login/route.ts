import {
  buildKioskPairingSession,
  buildKioskBootstrap,
  createKioskAuthClient,
  jsonError,
  jsonOk,
  KioskApiError,
  resolveKioskContext,
} from "@/lib/kiosk/server";
import { checkRateLimit } from "@/lib/rate-limit";

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

    // 10 attempts per email per 15 minutes
    if (email) {
      const rl = await checkRateLimit(`login:${email}`, 900, 10);
      if (!rl.allowed) return rl.response;
    }

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
