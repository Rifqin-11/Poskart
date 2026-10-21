import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSubscriptionActive } from "@/lib/subscription-policy";

/** Fail closed before creating transactions or pairing devices, regardless of caller. */
export async function requireOperationalSubscription(
  client: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await client
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error("Status subscription belum dapat diverifikasi. Silakan coba lagi.");
  if (!isSubscriptionActive(data)) {
    throw new Error("Belum ada subscription aktif. Aktifkan subscription melalui Poskart Admin untuk membuat transaksi atau pairing device.");
  }
}
