import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/auth/site-url";
import { completeKioskGoogleCallback } from "@/lib/kiosk/oauth";
import { createClient } from "@/lib/supabase/server";
import { recordSignupCompleted } from "@/server/product-usage";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("kiosk") === "1") {
    return completeKioskGoogleCallback(request);
  }

  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const isSignup = requestUrl.searchParams.get("signup") === "1";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    if (isSignup) {
      const { data: userData } = await supabase.auth.getUser();
      await recordSignupCompleted({
        userId: userData.user?.id,
        provider: "google",
      });
    }
  }

  // Always redirect to the canonical site URL — protects against Supabase
  // sending us back via the project's default Site URL (which could still
  // be a localhost value on a misconfigured project).
  const siteUrl = await getSiteUrl();
  return NextResponse.redirect(new URL(next, siteUrl));
}
