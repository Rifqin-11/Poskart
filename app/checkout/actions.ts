"use server";

import { redirect } from "next/navigation";
import { calculateSubscriptionTotal, pricingPlans } from "@/lib/constants/business";
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

export async function createSubscriptionOrderAction(formData: FormData) {
  const planId = valueFromForm(formData, "planId") || "yearly";
  const plan = pricingPlans.find((item) => item.id === planId);

  if (!plan) {
    redirectWithStatus("yearly", "error", "Selected subscription plan is invalid.");
  }

  const customerName = valueFromForm(formData, "customerName");
  const email = valueFromForm(formData, "email");
  const whatsapp = valueFromForm(formData, "whatsapp");
  const companyName = valueFromForm(formData, "companyName");
  const quote = calculateSubscriptionTotal(
    plan,
    numberFromForm(formData, "deviceCount", 1),
  );

  if (!customerName || !email || !whatsapp) {
    redirectWithStatus(plan.id, "error", "Name, email, and WhatsApp number are required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectWithStatus(plan.id, "error", "Please enter a valid billing email.");
  }

  const supabase = await createClient();
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
    whatsapp,
    company_name: companyName || null,
    status: "pending",
  });

  if (error) {
    redirectWithStatus(plan.id, "error", error.message);
  }

  redirectWithStatus(plan.id, "success", "Subscription order has been saved. Our team will continue the payment flow.");
}
