import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal session probe for statically rendered public pages.
 *
 * Reading the auth cookie here keeps the landing page prerenderable while
 * still letting the header swap in the "Dashboard" shortcut for signed-in
 * visitors. Only the email is returned; no profile or organization data.
 */
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
} as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const email =
      typeof data?.claims?.email === "string" ? data.claims.email : null;

    return NextResponse.json({ email }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ email: null }, { headers: noStoreHeaders });
  }
}
