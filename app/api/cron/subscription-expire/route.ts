import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return (
    Boolean(cronSecret) &&
    request.headers.get("authorization") === `Bearer ${cronSecret}`
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Expire trialing subscriptions past their current_period_end
    const { error: subError, count: expiredSubs } = await supabase
      .from("subscriptions")
      .update({ status: "free", plan_id: "free" })
      .eq("status", "trialing")
      .lt("current_period_end", new Date().toISOString())
      .select("*", { count: "exact", head: true });

    if (subError) throw new Error(`Failed to expire subscriptions: ${subError.message}`);

    // Mark trial claims as expired
    const { error: claimError, count: expiredClaims } = await supabase
      .from("trial_claims")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString())
      .select("*", { count: "exact", head: true });

    if (claimError) throw new Error(`Failed to expire claims: ${claimError.message}`);

    return Response.json({
      success: true,
      expiredSubscriptions: expiredSubs ?? 0,
      expiredClaims: expiredClaims ?? 0,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
