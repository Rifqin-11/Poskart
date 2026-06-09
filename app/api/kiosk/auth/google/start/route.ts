import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/auth/site-url";
import {
  createKioskOAuthClient,
  kioskCallbackPage,
  kioskCallbackUri,
} from "@/lib/kiosk/oauth";

export async function GET(request: NextRequest) {
  // hardwareId is the Android hardware ID sent by Flutter — optional here
  // because the device UPSERT happens in the OAuth callback (oauth.ts).
  const hardwareId = request.nextUrl.searchParams.get("hardwareId")?.trim() ?? "";

  try {
    const siteUrl = await getSiteUrl();
    const callbackUrl = new URL("/auth/callback", siteUrl);
    callbackUrl.searchParams.set("kiosk", "1");
    // Forward hardwareId so the callback can perform device UPSERT
    if (hardwareId) callbackUrl.searchParams.set("hardwareId", hardwareId);
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
