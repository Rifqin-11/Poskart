import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import {
  mapDuitkuResultCode,
  type DuitkuCallbackPayload,
  verifyDuitkuCallbackSignature,
} from "@/lib/duitku";

export async function POST(request: NextRequest) {
  const payload = await readDuitkuPayload(request);

  if (!payload?.merchantOrderId) {
    return NextResponse.json({ message: "Invalid Duitku callback payload." }, { status: 400 });
  }

  if (!verifyDuitkuCallbackSignature(payload)) {
    return NextResponse.json({ message: "Invalid Duitku callback signature." }, { status: 401 });
  }

  const supabase = getServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required to process Duitku callbacks." },
      { status: 500 },
    );
  }

  const status = mapDuitkuResultCode(payload.resultCode);
  const { data: order, error: orderError } = await supabase
    .from("subscription_orders")
    .select("merchant_order_id,email,organization_id,profile_id,plan_id,duration_months,device_count")
    .eq("merchant_order_id", payload.merchantOrderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ message: orderError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("subscription_orders")
    .update({
      status,
      payment_reference: payload.reference ?? null,
      gateway_response: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("merchant_order_id", payload.merchantOrderId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (status === "paid" && order) {
    const activationError = await activateSubscription(supabase, order);
    if (activationError) {
      return NextResponse.json({ message: activationError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "OK" });
}

type SubscriptionOrder = {
  email: string;
  organization_id: string | null;
  profile_id: string | null;
  plan_id: string;
  duration_months: number;
  device_count: number;
};

async function activateSubscription(supabase: SupabaseClient, order: SubscriptionOrder) {
  const organizationId = order.organization_id ?? (await findOrganizationId(supabase, order));

  if (!organizationId) {
    return new Error("No organization found for paid subscription order.");
  }

  const periodEnd = addMonths(new Date(), Math.max(1, order.duration_months || 1));
  const { error } = await supabase.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      plan_id: order.plan_id,
      status: "active",
      current_period_end: periodEnd.toISOString(),
      device_limit: Math.max(1, order.device_count || 1),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  return error ? new Error(error.message) : null;
}

async function findOrganizationId(supabase: SupabaseClient, order: SubscriptionOrder) {
  let profileId = order.profile_id;

  if (!profileId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", order.email)
      .maybeSingle();
    profileId = profile?.id ?? null;
  }

  if (!profileId) return null;

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  return member?.organization_id ?? null;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

async function readDuitkuPayload(request: NextRequest): Promise<DuitkuCallbackPayload | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => null)) as DuitkuCallbackPayload | null;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return null;

  return Object.fromEntries(formData.entries()) as DuitkuCallbackPayload;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
