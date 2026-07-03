import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  DuitkuCallbackPayload,
  DuitkuTransactionStatusResult,
} from "@/server/payments/duitku";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type LedgerTransactionRow = {
  id: string;
  organization_id: string | null;
  amount: number;
  provider: string | null;
  collection_mode: string | null;
  payment_gateway: string | null;
  merchant_order_id: string | null;
  payment_reference: string | null;
  booth: string | null;
  package_name: string | null;
  paid_at: string | null;
  created_at: string | null;
  gateway_response: Record<string, unknown> | null;
};

type PayoutFeeSettings = {
  gatewayFeePercentage: number;
  platformFeePercentage: number;
};

export async function recordDuitkuPaymentLedgerEntry(
  supabase: SupabaseAdminClient,
  input: {
    transaction: LedgerTransactionRow;
    verifiedStatus: DuitkuTransactionStatusResult;
    callbackPayload?: DuitkuCallbackPayload | null;
  },
) {
  const { transaction, verifiedStatus, callbackPayload } = input;

  if (
    !transaction.organization_id ||
    !transaction.merchant_order_id ||
    transaction.provider !== "QRIS" ||
    transaction.payment_gateway !== "duitku" ||
    transaction.collection_mode === "custom" ||
    verifiedStatus.statusCode !== "00"
  ) {
    return null;
  }

  const grossAmount = Math.max(
    0,
    Math.round(Number(verifiedStatus.amount ?? transaction.amount)),
  );
  const transactionAmount = Math.max(0, Math.round(Number(transaction.amount)));

  if (grossAmount !== transactionAmount) {
    throw new Error(
      `Duitku amount mismatch for ${transaction.merchant_order_id}: expected ${transactionAmount}, got ${grossAmount}.`,
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("payment_ledger_entries")
    .select("id")
    .eq("merchant_order_id", transaction.merchant_order_id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Gagal cek ledger pembayaran: ${existingError.message}`);
  }
  if (existing?.id) return existing;

  const settings = await loadPayoutFeeSettings(supabase);
  const gatewayFeeFromDuitku = parseMoney(verifiedStatus.fee);
  const gatewayFeeAmount =
    gatewayFeeFromDuitku ??
    Math.round((grossAmount * settings.gatewayFeePercentage) / 100);
  const platformFeeAmount = Math.round(
    (grossAmount * settings.platformFeePercentage) / 100,
  );
  const netAmount = Math.max(0, grossAmount - gatewayFeeAmount - platformFeeAmount);
  const now = new Date().toISOString();
  const paidAt = transaction.paid_at ?? now;

  const { data, error } = await supabase
    .from("payment_ledger_entries")
    .insert({
      organization_id: transaction.organization_id,
      transaction_id: transaction.id,
      provider: "duitku",
      payment_method: "QRIS",
      collection_mode: "platform",
      merchant_order_id: transaction.merchant_order_id,
      duitku_reference: verifiedStatus.reference ?? transaction.payment_reference,
      status: "paid",
      gross_amount: grossAmount,
      gateway_fee_amount: gatewayFeeAmount,
      platform_fee_amount: platformFeeAmount,
      adjustment_amount: 0,
      net_amount: netAmount,
      booth: transaction.booth,
      package_name: transaction.package_name,
      paid_at: paidAt,
      verified_at: now,
      callback_payload: callbackPayload ?? {},
      verified_response: verifiedStatus.raw,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: duplicate } = await supabase
        .from("payment_ledger_entries")
        .select("id")
        .eq("merchant_order_id", transaction.merchant_order_id)
        .maybeSingle();
      if (duplicate?.id) return duplicate;
    }
    throw new Error(`Gagal membuat ledger pembayaran: ${error.message}`);
  }

  return data;
}

async function loadPayoutFeeSettings(
  supabase: SupabaseAdminClient,
): Promise<PayoutFeeSettings> {
  const { data, error } = await supabase
    .from("app_configs")
    .select("gateway_fee_percentage,platform_fee_percentage")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.code === "42P01") {
      return { gatewayFeePercentage: 0, platformFeePercentage: 0 };
    }
    throw new Error(`Gagal memuat fee payout: ${error.message}`);
  }

  return {
    gatewayFeePercentage: Number(data?.gateway_fee_percentage ?? 0),
    platformFeePercentage: Number(data?.platform_fee_percentage ?? 0),
  };
}

function parseMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
  }
  return null;
}
