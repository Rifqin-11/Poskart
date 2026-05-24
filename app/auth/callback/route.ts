import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Always redirect to the canonical site URL — protects against Supabase
  // sending us back via the project's default Site URL (which could still
  // be a localhost value on a misconfigured project).
  const siteUrl = await getSiteUrl();
  return NextResponse.redirect(new URL(next, siteUrl));
}
