import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordPaymentIssue(client: SupabaseClient, input: {
  merchantOrderId: string; organizationId?: string | null;
  kind: string; evidence: Record<string, unknown>;
}) {
  // Only bounded, explicit evidence: never persist signatures, API keys or raw
  // untrusted callback bodies. An issue does not establish entitlement to money.
  const { error } = await client.from("payment_reconciliation_issues").upsert({
    issue_key: `${input.kind}:${input.merchantOrderId}`,
    merchant_order_id: input.merchantOrderId,
    organization_id: input.organizationId ?? null,
    kind: input.kind, status: "open", evidence: input.evidence,
    resolved_at: null, last_seen_at: new Date().toISOString(),
  }, { onConflict: "issue_key" });
  if (error) throw new Error(`Reconciliation issue could not be persisted: ${error.message}`);
}
