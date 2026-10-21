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
    verifiedStatus.statusCode !== "00"
  ) {
    return null;
  }

  const grossAmount = Number(verifiedStatus.amount);
  const transactionAmount = Math.max(0, Math.round(Number(transaction.amount)));

  if (!Number.isSafeInteger(grossAmount) || grossAmount !== transactionAmount ||
      verifiedStatus.merchantOrderId !== transaction.merchant_order_id ||
      !verifiedStatus.reference ||
      (transaction.payment_reference && transaction.payment_reference !== verifiedStatus.reference)) {
    throw new Error(
      `Duitku amount mismatch for ${transaction.merchant_order_id}: expected ${transactionAmount}, got ${grossAmount}.`,
    );
  }

  const settlementDate = normalizeDuitkuSettlementDate(
    callbackPayload?.settlementDate,
  );
  const settlementState = getEstimatedSettlementState(settlementDate);
  const settings = await loadPayoutFeeSettings(supabase);
  const gatewayFeeAmount = calculatePaymentGatewayFee(grossAmount, settings);
  const platformFeeAmount = 0;
  const netAmount = Math.max(0, grossAmount - gatewayFeeAmount - platformFeeAmount);
  const now = new Date().toISOString();
  const paidAt = transaction.paid_at ?? now;

  const { data, error } = await supabase.rpc("finalize_verified_duitku_payment", {
    p_transaction_id: transaction.id,
    p_verified: {
      ...verifiedStatus.raw,
      merchantOrderId: verifiedStatus.merchantOrderId,
      reference: verifiedStatus.reference,
      amount: grossAmount,
      statusCode: verifiedStatus.statusCode,
    },
    p_ledger: transaction.collection_mode === "custom" ? null : {
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
    },
  });

  if (error) {
    throw new Error(`Gagal membuat ledger pembayaran: ${error.message}`);
  }

  return data;
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
