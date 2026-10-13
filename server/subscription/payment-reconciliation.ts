import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDuitkuTransactionStatus, mapDuitkuTransactionStatusCode } from "@/server/payments/duitku";
import { cancelMidtransTransaction, checkMidtransTransactionStatus, mapMidtransTransactionStatus } from "@/server/payments/midtrans";
import { isSubscriptionPaymentOpen, type SubscriptionPayment, type SubscriptionPaymentStatus } from "@/features/billing/subscription/payment-types";

export const subscriptionPaymentColumns = "merchant_order_id,plan_name,amount,duration_months,device_count,status,payment_gateway,payment_url,created_at,gateway_status_checked_at,subscription_activated_at,payment_expires_at,payment_closed_reason,payment_cancelled_at,gateway_cancelled_at";

export class SubscriptionPaymentBusyError extends Error {}

export async function expireSubscriptionPayments(supabase: SupabaseClient, organizationId: string) {
  const { error } = await supabase.rpc("expire_subscription_payments", { p_organization_id: organizationId });
  if (error) throw new Error(error.message);
}

async function readSubscriptionPayment(supabase: SupabaseClient, orderId: string, organizationId: string) {
  const { data, error } = await supabase.from("subscription_orders")
    .select(subscriptionPaymentColumns)
    .eq("merchant_order_id", orderId)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw new Error(error.message);
  return data as SubscriptionPayment;
}

export async function reconcileSubscriptionPayment(
  supabase: SupabaseClient,
  input: {
    merchantOrderId: string;
    status: SubscriptionPaymentStatus;
    reference?: string | null;
    paymentMethod?: string | null;
    response: unknown;
  },
) {
  const { error } = await supabase.rpc("reconcile_subscription_payment", {
    p_merchant_order_id: input.merchantOrderId,
    p_status: input.status,
    p_reference: input.reference ?? null,
    p_payment_method: input.paymentMethod ?? null,
    p_gateway_response: input.response,
    p_checked_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function refreshSubscriptionPayment(
  supabase: SupabaseClient,
  order: SubscriptionPayment,
  organizationId: string,
  requireFreshCheck = false,
): Promise<SubscriptionPayment> {
  if (order.status === "paid") return order;
  if (!isSubscriptionPaymentOpen(order)) {
    if (order.status === "pending") {
      await expireSubscriptionPayments(supabase, organizationId);
      return readSubscriptionPayment(supabase, order.merchant_order_id, organizationId);
    }
    return order;
  }

  // A database-backed cooldown also protects against multiple tabs/users.
  let claimFilter = `gateway_status_check_started_at.is.null,gateway_status_check_started_at.lt.${new Date(Date.now() - 15_000).toISOString()}`;
  if (requireFreshCheck && order.gateway_status_checked_at && Number.isFinite(new Date(order.gateway_status_checked_at).getTime())) {
    // A completed check is not an in-flight lock. Cancellation can claim a
    // fresh verification immediately, without waiting for the polling cooldown.
    claimFilter += `,gateway_status_check_started_at.lte.${order.gateway_status_checked_at}`;
  }
  const { data: claim, error: claimError } = await supabase
    .from("subscription_orders")
    .update({ gateway_status_check_started_at: new Date().toISOString() })
    .eq("merchant_order_id", order.merchant_order_id)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .gt("payment_expires_at", new Date().toISOString())
    .or(claimFilter)
    .select("merchant_order_id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);

  if (claim) {
    await verifySubscriptionPayment(supabase, order);
  } else if (requireFreshCheck) {
    const latest = await readSubscriptionPayment(supabase, order.merchant_order_id, organizationId);
    if (!isSubscriptionPaymentOpen(latest)) return latest;
    throw new SubscriptionPaymentBusyError("Status pembayaran sedang diperiksa. Tunggu sebentar lalu coba batalkan lagi.");
  }

  return readSubscriptionPayment(supabase, order.merchant_order_id, organizationId);
}

async function verifySubscriptionPayment(supabase: SupabaseClient, order: SubscriptionPayment) {
  if (order.payment_gateway === "duitku") {
    const result = await checkDuitkuTransactionStatus(order.merchant_order_id);
    if (!["00", "01", "02"].includes(result.statusCode ?? "")) {
      throw new Error("Gateway belum memberikan status pembayaran yang valid.");
    }
    if (result.merchantOrderId !== order.merchant_order_id ||
        (result.amount !== undefined && result.amount !== Number(order.amount)) ||
        (result.statusCode === "00" && result.amount === undefined)) {
      throw new Error("Detail pembayaran gateway tidak cocok dengan order.");
    }
    await reconcileSubscriptionPayment(supabase, {
      merchantOrderId: order.merchant_order_id,
      status: mapDuitkuTransactionStatusCode(result.statusCode),
      reference: result.reference,
      response: result.raw,
    });
  } else if (order.payment_gateway === "midtrans") {
    const result = await checkMidtransTransactionStatus(order.merchant_order_id);
    if (result.order_id !== order.merchant_order_id ||
        Number(result.gross_amount) !== Number(order.amount)) {
      throw new Error("Detail pembayaran gateway tidak cocok dengan order.");
    }
    await reconcileSubscriptionPayment(supabase, {
      merchantOrderId: order.merchant_order_id,
      status: mapMidtransTransactionStatus(result),
      reference: result.transaction_id,
      paymentMethod: result.payment_type,
      response: result,
    });
  } else {
    throw new Error("Gateway pembayaran ini belum mendukung pengecekan status.");
  }
}

export async function cancelSubscriptionPayment(
  supabase: SupabaseClient, order: SubscriptionPayment, organizationId: string,
): Promise<SubscriptionPayment> {
  // Always verify freshly before cancellation. A cached/cooldown result is not
  // sufficient: the customer might just have completed their payment.
  const verified = await refreshSubscriptionPayment(supabase, order, organizationId, true);
  if (!isSubscriptionPaymentOpen(verified)) return verified;

  if (order.payment_gateway === "midtrans") {
    try {
      const result = await cancelMidtransTransaction(order.merchant_order_id);
      if (result.order_id !== order.merchant_order_id || Number(result.gross_amount) !== Number(order.amount)) {
        throw new Error("Detail pembatalan tidak cocok dengan order.");
      }
      await reconcileSubscriptionPayment(supabase, {
        merchantOrderId: order.merchant_order_id,
        status: "cancelled",
        reference: result.transaction_id,
        paymentMethod: result.payment_type,
        response: result,
      });
      return readSubscriptionPayment(supabase, order.merchant_order_id, organizationId);
    } catch (error) {
      console.warn("Gateway cancellation unavailable; verifying before local cancellation", error);
      // Cancellation may have raced with settlement, or timed out after being
      // accepted. Recheck before deciding whether local cancellation is safe.
      await verifySubscriptionPayment(supabase, order);
      const latest = await readSubscriptionPayment(supabase, order.merchant_order_id, organizationId);
      if (!isSubscriptionPaymentOpen(latest)) return latest;
    }
  }

  // Duitku POP has no general cancel endpoint. Local cancellation does not
  // promise that a previously issued external invoice has been revoked.
  const { error } = await supabase.rpc("cancel_subscription_payment", {
    p_merchant_order_id: order.merchant_order_id,
    p_organization_id: organizationId,
  });
  if (error) throw new Error(error.message);
  return readSubscriptionPayment(supabase, order.merchant_order_id, organizationId);
}
