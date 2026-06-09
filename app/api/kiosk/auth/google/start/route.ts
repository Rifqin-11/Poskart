import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/auth/site-url";
import {
  createKioskOAuthClient,
  kioskCallbackPage,
  kioskCallbackUri,
} from "@/lib/kiosk/oauth";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim() ?? "";
  if (!deviceId) {
    return kioskCallbackPage(
      kioskCallbackUri({
        error: "Device ID wajib diisi sebelum login dengan Google.",
      }),
      false,
    );
  }

  try {
    const siteUrl = await getSiteUrl();
    const callbackUrl = new URL("/auth/callback", siteUrl);
    callbackUrl.searchParams.set("kiosk", "1");
    callbackUrl.searchParams.set("deviceId", deviceId);
    const oauth = createKioskOAuthClient(request);
    const { data, error } = await oauth.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return kioskCallbackPage(
        kioskCallbackUri({
          error: error?.message ?? "Google login tidak dapat dimulai.",
        }),
        false,
      );
    }

    return oauth.applyCookies(NextResponse.redirect(data.url));
  } catch (error) {
    return kioskCallbackPage(
      kioskCallbackUri({
        error:
          error instanceof Error
            ? error.message
            : "Google login tidak dapat dimulai.",
      }),
      false,
    );
  }
}
