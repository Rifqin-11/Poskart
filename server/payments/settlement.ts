import "server-only";

import { formatJakartaDateInput } from "@/lib/jakarta-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GatewaySettlementStatus = "pending" | "settled";

export function normalizeDuitkuSettlementDate(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
}

export function getEstimatedSettlementState(
  settlementDate: string | null,
  now = new Date(),
): {
  status: GatewaySettlementStatus;
  availableAt: string | null;
} {
  if (
    settlementDate &&
    settlementDate <= formatJakartaDateInput(now)
  ) {
    return { status: "settled", availableAt: now.toISOString() };
  }

  return { status: "pending", availableAt: null };
}

export async function releaseDueEstimatedSettlements(now = new Date()) {
  const supabase = createSupabaseAdminClient();
  const jakartaDate = formatJakartaDateInput(now);
  const availableAt = now.toISOString();

  const { data, error } = await supabase
    .from("payment_ledger_entries")
    .update({
      gateway_settlement_status: "settled",
      gateway_balance_available_at: availableAt,
    })
    .eq("status", "paid")
    .eq("provider", "duitku")
    .eq("payment_method", "QRIS")
    .eq("collection_mode", "platform")
    .eq("gateway_settlement_status", "pending")
    .not("gateway_settlement_date", "is", null)
    .lte("gateway_settlement_date", jakartaDate)
    .select("id");

  if (error) {
    throw new Error(`Gagal memproses settlement payout: ${error.message}`);
  }

  return {
    processed: data?.length ?? 0,
    settlementDate: jakartaDate,
    availableAt,
  };
}
