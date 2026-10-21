"use server";

import { redirect } from "next/navigation";
import {
  businessProfile,
  calculateSubscriptionTotal,
} from "@/lib/constants/business";
import {
  createDuitkuPayment,
  createMerchantOrderId,
  getDuitkuConfig,
} from "@/server/payments/duitku";
import { createMidtransPayment } from "@/server/payments/midtrans";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { expireSubscriptionPayments, refreshSubscriptionPayment, subscriptionPaymentColumns } from "@/server/subscription/payment-reconciliation";
import { getSubscriptionPaymentUrl, type SubscriptionPayment } from "@/features/billing/subscription/payment-types";
import { quoteSubscriptionPromotion } from "@/server/subscription/promotions";

function redirectWithStatus(
  planId: string,
  type: "success" | "error",
  message: string,
): never {
  const params = new URLSearchParams({ plan: planId, [type]: message });
  redirect(`/checkout?${params.toString()}`);
}

function valueFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function numberFromForm(formData: FormData, key: string, fallback: number) {
  const value = Number(valueFromForm(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function normalizePaymentGateway(value: string) {
  return value === "midtrans" ? "midtrans" : "duitku";
}

function normalizeGatewayMode(value: unknown): "duitku" | "midtrans" | "both" {
  return value === "midtrans" || value === "both" ? value : "duitku";
}

function resolveAllowedPaymentGateway(
  requestedGateway: "duitku" | "midtrans",
  gatewayMode: "duitku" | "midtrans" | "both",
) {
  if (gatewayMode === "both") return requestedGateway;
  return gatewayMode;
}

function stringFromMetadata(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export type SubscriptionCheckoutActionResult =
  | {
      ok: true;
      gateway: "duitku";
      merchantOrderId: string;
      reference: string;
      paymentUrl: string;
      popScriptUrl: string;
      returnUrl: string;
    }
  | {
      ok: true;
      gateway: "midtrans";
      merchantOrderId: string;
      paymentUrl: string;
    }
  | {
      ok: false;
      message: string;
      planId: string;
    };

export async function createSubscriptionOrderAction(formData: FormData) {
  const promotionCode = valueFromForm(formData, "promotionCode").toUpperCase();
  const planId = valueFromForm(formData, "planId") || "starter-monthly";
  const requestedPaymentGateway = normalizePaymentGateway(
    valueFromForm(formData, "paymentGateway"),
  );
  const supabase = await createClient();
  const plans = await getPublicSubscriptionPricingPlans(supabase);
  const plan = plans.find((item) => item.id === planId);

  if (!plan) {
    redirectWithStatus(
      "starter-monthly",
      "error",
      "Selected subscription plan is invalid.",
    );
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;

  if (authError || !user?.email) {
    redirect(`/login?next=${encodeURIComponent(`/checkout?plan=${plan.id}`)}`);
  }

  const { data: gatewayConfig } = await supabase
    .from("app_configs")
    .select("subscription_payment_gateway")
    .eq("id", "default")
    .maybeSingle();
  const paymentGateway = resolveAllowedPaymentGateway(
    requestedPaymentGateway,
    normalizeGatewayMode(gatewayConfig?.subscription_payment_gateway),
  );

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const email = user.email;
  const customerName =
    stringFromMetadata(metadata, ["full_name", "name", "display_name"]) ||
    email.split("@")[0] ||
    "POSKART Customer";
  const whatsapp = stringFromMetadata(metadata, [
    "phone",
    "phone_number",
    "whatsapp",
  ]);
  const companyName = stringFromMetadata(metadata, [
    "company_name",
    "business_name",
    "organization_name",
  ]);
  const quote = calculateSubscriptionTotal(
    plan,
    numberFromForm(formData, "deviceCount", 1),
  );

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      message: "Please enter a valid billing email.",
      planId: plan.id,
    } satisfies SubscriptionCheckoutActionResult;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return {
      ok: false,
      message: "Please create or join an organization before subscribing.",
      planId: plan.id,
    } satisfies SubscriptionCheckoutActionResult;
  }

  const siteUrl = await getSiteUrl();
  const paymentMetadataClient = createSupabaseAdminClient();
  try {
    await expireSubscriptionPayments(paymentMetadataClient, membership.organization_id);
  } catch {
    return { ok: false, message: "Pembayaran sebelumnya belum dapat diperiksa. Coba lagi nanti.", planId: plan.id } satisfies SubscriptionCheckoutActionResult;
  }
  const { data: existingOrder, error: existingOrderError } = await paymentMetadataClient
    .from("subscription_orders")
    .select(`${subscriptionPaymentColumns},payment_reference`)
    .eq("organization_id", membership.organization_id)
    .eq("plan_id", plan.id)
    .eq("device_count", quote.deviceCount)
    .eq("base_amount", quote.baseAmount)
    .eq("additional_device_amount", quote.additionalDeviceAmount)
    .filter("promotion_code", promotionCode ? "eq" : "is", promotionCode || null)
    .eq("payment_gateway", paymentGateway)
    .eq("status", "pending")
    .not("payment_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingOrderError) {
    return { ok: false, message: "Pembayaran sebelumnya belum dapat diperiksa. Coba lagi nanti agar tidak membuat pembayaran ganda.", planId: plan.id } satisfies SubscriptionCheckoutActionResult;
  }
  if (existingOrder) {
    let previousPayment = existingOrder as SubscriptionPayment;
    try {
      previousPayment = await refreshSubscriptionPayment(paymentMetadataClient, previousPayment, membership.organization_id);
    } catch {
      // A gateway outage is not a reason to issue a second invoice.
    }
    if (previousPayment.status === "paid") {
      return { ok: false, message: "Pembayaran sebelumnya sudah berhasil dan masa aktif telah diperpanjang. Lihat subscription di Settings → Organization.", planId: plan.id } satisfies SubscriptionCheckoutActionResult;
    }
    const resumeUrl = getSubscriptionPaymentUrl(previousPayment);
    if (previousPayment.status === "pending" && resumeUrl) {
      if (paymentGateway === "midtrans") {
        return { ok: true, gateway: "midtrans", merchantOrderId: previousPayment.merchant_order_id, paymentUrl: resumeUrl } satisfies SubscriptionCheckoutActionResult;
      }
      if (existingOrder.payment_reference) {
        return {
          ok: true,
          gateway: "duitku",
          merchantOrderId: previousPayment.merchant_order_id,
          reference: existingOrder.payment_reference,
          paymentUrl: resumeUrl,
          popScriptUrl: getDuitkuConfig()?.popScriptUrl ?? "https://app-prod.duitku.com/lib/js/duitku.js",
          returnUrl: `${siteUrl}/checkout/return?order=${encodeURIComponent(previousPayment.merchant_order_id)}`,
        } satisfies SubscriptionCheckoutActionResult;
      }
      return { ok: false, message: "Masih ada pembayaran yang menunggu konfirmasi. Cek statusnya di Settings → Organization sebelum membuat pembayaran baru.", planId: plan.id } satisfies SubscriptionCheckoutActionResult;
    }
    if (previousPayment.status === "pending") {
      return { ok: false, message: "Masih ada pembayaran yang menunggu konfirmasi. Cek statusnya di Settings → Organization sebelum membuat pembayaran baru.", planId: plan.id } satisfies SubscriptionCheckoutActionResult;
    }
  }

  const merchantOrderId = createMerchantOrderId();
  let promotion;
  try {
    promotion = promotionCode ? await quoteSubscriptionPromotion(paymentMetadataClient, promotionCode, membership.organization_id, plan.id, quote.totalAmount) : null;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Voucher tidak dapat digunakan.", planId: plan.id } satisfies SubscriptionCheckoutActionResult;
  }
  if (promotion && numberFromForm(formData, "promotionTotal", -1) !== promotion.totalAmount) {
    return { ok: false, message: "Harga promo berubah. Terapkan ulang voucher sebelum membayar.", planId: plan.id } satisfies SubscriptionCheckoutActionResult;
  }
  const { data: insertedOrder, error } = await paymentMetadataClient.from("subscription_orders").insert({
    organization_id: membership.organization_id,
    profile_id: user.id,
    plan_id: plan.id,
    plan_name: plan.name,
    duration_months: plan.durationMonths,
    device_count: quote.deviceCount,
    included_devices: quote.includedDevices,
    additional_devices: quote.additionalDevices,
    additional_device_price_monthly: quote.additionalDevicePriceMonthly,
    base_amount: quote.baseAmount,
    additional_device_amount: quote.additionalDeviceAmount,
    amount: promotion?.totalAmount ?? quote.totalAmount,
    customer_name: customerName,
    email,
    whatsapp: whatsapp || businessProfile.phone,
    company_name: companyName || null,
    status: "pending",
    payment_gateway: paymentGateway,
    payment_method: paymentGateway === "midtrans" ? "snap" : "duitku_pop",
    merchant_order_id: merchantOrderId,
    campaign_id: promotion?.campaignId ?? null,
    promotion_code: promotion?.code ?? null,
  }).select("amount").single();

  if (error) {
    return {
      ok: false,
      message: error.message,
      planId: plan.id,
    } satisfies SubscriptionCheckoutActionResult;
  }

  try {
    // The database trigger validates and snapshots the final payable amount.
    const payableAmount = insertedOrder!.amount;
    const returnUrl = `${siteUrl}/checkout/return?order=${encodeURIComponent(merchantOrderId)}`;

    if (paymentGateway === "midtrans") {
      const payment = await createMidtransPayment({
        merchantOrderId,
        amount: payableAmount,
        plan,
        customerName,
        email,
        phoneNumber: whatsapp || undefined,
        deviceCount: quote.deviceCount,
        returnUrl,
      });
      const { error: paymentUpdateError } = await paymentMetadataClient
        .from("subscription_orders")
        .update({
          payment_url: payment.paymentUrl,
          payment_reference: payment.token ?? null,
          gateway_response: payment.raw,
          updated_at: new Date().toISOString(),
        })
        .eq("merchant_order_id", merchantOrderId);
      if (paymentUpdateError) throw paymentUpdateError;
      return {
        ok: true,
        gateway: "midtrans",
        merchantOrderId,
        paymentUrl: payment.paymentUrl,
      } satisfies SubscriptionCheckoutActionResult;
    } else {
      const payment = await createDuitkuPayment({
        merchantOrderId,
        amount: payableAmount,
        plan,
        customerName,
        email,
        phoneNumber: whatsapp || undefined,
        deviceCount: quote.deviceCount,
        returnUrl,
        callbackUrl: `${siteUrl}/api/payments/duitku/callback`,
        // No paymentMethod means Duitku POP shows every channel enabled for
        // the POSKART merchant instead of forcing a single QRIS channel.
      });
      if (!payment.reference || !payment.paymentUrl) {
        return {
          ok: false,
          message: "Duitku did not return a payment reference.",
          planId: plan.id,
        } satisfies SubscriptionCheckoutActionResult;
      }
      const { error: paymentUpdateError } = await paymentMetadataClient
        .from("subscription_orders")
        .update({
          payment_url: payment.paymentUrl,
          payment_reference: payment.reference ?? null,
          gateway_response: payment.raw,
          updated_at: new Date().toISOString(),
        })
        .eq("merchant_order_id", merchantOrderId);
      if (paymentUpdateError) throw paymentUpdateError;
      return {
        ok: true,
        gateway: "duitku",
        merchantOrderId,
        reference: payment.reference,
        paymentUrl: payment.paymentUrl,
        popScriptUrl: payment.popScriptUrl,
        returnUrl,
      } satisfies SubscriptionCheckoutActionResult;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment gateway could not be started.";
    return {
      ok: false,
      message,
      planId: plan.id,
    } satisfies SubscriptionCheckoutActionResult;
  }
}
