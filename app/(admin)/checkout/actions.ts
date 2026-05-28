"use server";

import { redirect } from "next/navigation";
import { businessProfile, calculateSubscriptionTotal } from "@/lib/constants/business";
import { createDuitkuPayment, createMerchantOrderId, getDuitkuConfig } from "@/lib/duitku";
import { createMidtransPayment } from "@/lib/midtrans";
import { getPublicSubscriptionPricingPlans } from "@/lib/subscription-pricing";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

function redirectWithStatus(planId: string, type: "success" | "error", message: string): never {
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

function stringFromMetadata(metadata: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export async function createSubscriptionOrderAction(formData: FormData) {
  const planId = valueFromForm(formData, "planId") || "yearly";
  const requestedPaymentGateway = normalizePaymentGateway(valueFromForm(formData, "paymentGateway"));
  const supabase = await createClient();
  const plans = await getPublicSubscriptionPricingPlans(supabase);
  const plan = plans.find((item) => item.id === planId);

  if (!plan) {
    redirectWithStatus("yearly", "error", "Selected subscription plan is invalid.");
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
  const whatsapp = stringFromMetadata(metadata, ["phone", "phone_number", "whatsapp"]);
  const companyName = stringFromMetadata(metadata, ["company_name", "business_name", "organization_name"]);
  const quote = calculateSubscriptionTotal(
    plan,
    numberFromForm(formData, "deviceCount", 1),
  );

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectWithStatus(plan.id, "error", "Please enter a valid billing email.");
  }

  const merchantOrderId = createMerchantOrderId();
  const duitkuConfig = getDuitkuConfig();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    redirectWithStatus(plan.id, "error", "Please create or join an organization before subscribing.");
  }

  const { error } = await supabase.from("subscription_orders").insert({
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
    amount: quote.totalAmount,
    customer_name: customerName,
    email,
    whatsapp: whatsapp || businessProfile.phone,
    company_name: companyName || null,
    status: "pending",
    payment_gateway: paymentGateway,
    payment_method: paymentGateway === "midtrans" ? "snap" : duitkuConfig?.paymentMethod ?? "VC",
    merchant_order_id: merchantOrderId,
  });

  if (error) {
    redirectWithStatus(plan.id, "error", error.message);
  }

  const siteUrl = await getSiteUrl();

  let paymentUrl = "";

  try {
    const returnUrl = `${siteUrl}/checkout/return?order=${encodeURIComponent(merchantOrderId)}`;

    if (paymentGateway === "midtrans") {
      const payment = await createMidtransPayment({
        merchantOrderId,
        amount: quote.totalAmount,
        plan,
        customerName,
        email,
        phoneNumber: whatsapp || undefined,
        deviceCount: quote.deviceCount,
        returnUrl,
      });
      paymentUrl = payment.paymentUrl;
      await supabase
        .from("subscription_orders")
        .update({
          payment_url: payment.paymentUrl,
          payment_reference: payment.token ?? null,
          gateway_response: payment.raw,
          updated_at: new Date().toISOString(),
        })
        .eq("merchant_order_id", merchantOrderId);
    } else {
      const payment = await createDuitkuPayment({
        merchantOrderId,
        amount: quote.totalAmount,
        plan,
        customerName,
        email,
        phoneNumber: whatsapp || undefined,
        deviceCount: quote.deviceCount,
        returnUrl,
        callbackUrl: `${siteUrl}/api/payments/duitku/callback`,
      });
      paymentUrl = payment.paymentUrl ?? "";
      await supabase
        .from("subscription_orders")
        .update({
          payment_url: payment.paymentUrl,
          payment_reference: payment.reference ?? null,
          gateway_response: payment.raw,
          updated_at: new Date().toISOString(),
        })
        .eq("merchant_order_id", merchantOrderId);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment gateway could not be started.";
    redirectWithStatus(plan.id, "error", message);
  }

  redirect(paymentUrl);
}
