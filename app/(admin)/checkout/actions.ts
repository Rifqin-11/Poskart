"use server";

import { redirect } from "next/navigation";
import { businessProfile, calculateSubscriptionTotal, pricingPlans } from "@/lib/constants/business";
import { createDuitkuPayment, createMerchantOrderId, getDuitkuConfig } from "@/lib/duitku";
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
  const plan = pricingPlans.find((item) => item.id === planId);

  if (!plan) {
    redirectWithStatus("yearly", "error", "Selected subscription plan is invalid.");
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;

  if (authError || !user?.email) {
    redirect(`/login?next=${encodeURIComponent(`/checkout?plan=${plan.id}`)}`);
  }

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
  const { error } = await supabase.from("subscription_orders").insert({
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
    payment_gateway: "duitku",
    payment_method: duitkuConfig?.paymentMethod ?? "VC",
    merchant_order_id: merchantOrderId,
  });

  if (error) {
    redirectWithStatus(plan.id, "error", error.message);
  }

  const siteUrl = await getSiteUrl();

  let paymentUrl = "";

  try {
    const payment = await createDuitkuPayment({
      merchantOrderId,
      amount: quote.totalAmount,
      plan,
      customerName,
      email,
      phoneNumber: whatsapp || undefined,
      deviceCount: quote.deviceCount,
      returnUrl: `${siteUrl}/checkout/return?order=${encodeURIComponent(merchantOrderId)}`,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Duitku payment could not be started.";
    redirectWithStatus(plan.id, "error", message);
  }

  redirect(paymentUrl);
}
