import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; response: Response };

// Checks rate limit via Supabase. Returns allowed:true or a ready 429 Response.
export async function checkRateLimit(
  key: string,
  windowSecs: number,
  max: number,
): Promise<RateLimitResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_window_secs: windowSecs,
      p_max: max,
    });
    if (error) {
      // Fail open: don't block legitimate requests if DB is unavailable.
      console.error("[rate-limit] DB error, failing open:", error.message);
      return { allowed: true };
    }
    if (data === false) {
      return {
        allowed: false,
        response: Response.json(
          { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
          { status: 429, headers: { "Retry-After": String(windowSecs) } },
        ),
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
