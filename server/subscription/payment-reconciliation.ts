import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDuitkuTransactionStatus, mapDuitkuTransactionStatusCode } from "@/server/payments/duitku";
import { checkMidtransTransactionStatus, mapMidtransTransactionStatus } from "@/server/payments/midtrans";
import type { SubscriptionPayment, SubscriptionPaymentStatus } from "@/features/billing/subscription/payment-types";

export const subscriptionPaymentColumns = "merchant_order_id,plan_name,amount,duration_months,device_count,status,payment_gateway,payment_url,created_at,gateway_status_checked_at,subscription_activated_at";

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
): Promise<SubscriptionPayment> {
  if (order.status === "paid") return order;

  // A database-backed cooldown also protects against multiple tabs/users.
  const { data: claim, error: claimError } = await supabase
    .from("subscription_orders")
    .update({ gateway_status_check_started_at: new Date().toISOString() })
    .eq("merchant_order_id", order.merchant_order_id)
    .eq("organization_id", organizationId)
    .neq("status", "paid")
    .or(`gateway_status_check_started_at.is.null,gateway_status_check_started_at.lt.${new Date(Date.now() - 15_000).toISOString()}`)
    .select("merchant_order_id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);

  if (claim) {
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

  const { data, error } = await supabase.from("subscription_orders")
    .select(subscriptionPaymentColumns)
    .eq("merchant_order_id", order.merchant_order_id)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw new Error(error.message);
  return data as SubscriptionPayment;
}
