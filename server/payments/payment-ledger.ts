import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  calculatePaymentGatewayFee,
  DEFAULT_GATEWAY_FEE_SETTINGS,
  normalizeGatewayFeeSettings,
  type GatewayFeeSettings,
} from "@/lib/payment-gateway-fee";
import type {
  DuitkuCallbackPayload,
  DuitkuTransactionStatusResult,
} from "@/server/payments/duitku";
import {
  getEstimatedSettlementState,
  normalizeDuitkuSettlementDate,
} from "@/server/payments/settlement";

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

  const settlementDate = normalizeDuitkuSettlementDate(
    callbackPayload?.settlementDate,
  );
  const settlementState = getEstimatedSettlementState(settlementDate);
  const { data: existing, error: existingError } = await supabase
    .from("payment_ledger_entries")
    .select("id,gateway_settlement_date")
    .eq("merchant_order_id", transaction.merchant_order_id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Gagal cek ledger pembayaran: ${existingError.message}`);
  }
  if (existing?.id) {
    if (!existing.gateway_settlement_date) {
      await saveSettlementEstimate(
        supabase,
        existing.id,
        settlementDate,
        settlementState,
      );
    }
    return existing;
  }

  const settings = await loadPayoutFeeSettings(supabase);
  const gatewayFeeAmount = calculatePaymentGatewayFee(grossAmount, settings);
  const platformFeeAmount = 0;
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
      gateway_settlement_status: settlementState.status,
      gateway_settlement_date: settlementDate,
      gateway_balance_available_at: settlementState.availableAt,
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
        .select("id,gateway_settlement_date")
        .eq("merchant_order_id", transaction.merchant_order_id)
        .maybeSingle();
      if (duplicate?.id) {
        if (!duplicate.gateway_settlement_date) {
          await saveSettlementEstimate(
            supabase,
            duplicate.id,
            settlementDate,
            settlementState,
          );
        }
        return duplicate;
      }
    }
    throw new Error(`Gagal membuat ledger pembayaran: ${error.message}`);
  }

  return data;
}

async function saveSettlementEstimate(
  supabase: SupabaseAdminClient,
  ledgerEntryId: string,
  settlementDate: string | null,
  settlementState: ReturnType<typeof getEstimatedSettlementState>,
) {
  if (!settlementDate) return;

  const { error } = await supabase
    .from("payment_ledger_entries")
    .update({
      gateway_settlement_date: settlementDate,
      gateway_settlement_status: settlementState.status,
      gateway_balance_available_at: settlementState.availableAt,
    })
    .eq("id", ledgerEntryId)
    .is("gateway_settlement_date", null);

  if (error) {
    throw new Error(
      `Gagal menyimpan estimasi settlement Duitku: ${error.message}`,
    );
  }
}

async function loadPayoutFeeSettings(
  supabase: SupabaseAdminClient,
): Promise<GatewayFeeSettings> {
  const { data, error } = await supabase
    .from("app_configs")
    .select(
      "gateway_fee_type,gateway_fee_percentage,gateway_fee_fixed_amount",
    )
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.code === "42P01") {
      return DEFAULT_GATEWAY_FEE_SETTINGS;
    }
    throw new Error(`Gagal memuat fee payout: ${error.message}`);
  }

  return normalizeGatewayFeeSettings({
    gatewayFeeType: data?.gateway_fee_type,
    gatewayFeePercentage: data?.gateway_fee_percentage,
    gatewayFeeFixedAmount: data?.gateway_fee_fixed_amount,
  });
}
