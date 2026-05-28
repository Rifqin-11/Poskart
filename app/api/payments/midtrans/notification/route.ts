import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import {
  mapMidtransTransactionStatus,
  type MidtransNotificationPayload,
  verifyMidtransNotificationSignature,
} from "@/lib/midtrans";
import { activatePaidSubscription } from "@/lib/payments/subscription-activation";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as MidtransNotificationPayload | null;

  if (!payload?.order_id) {
    return NextResponse.json({ message: "Invalid Midtrans notification payload." }, { status: 400 });
  }

  if (!verifyMidtransNotificationSignature(payload)) {
    return NextResponse.json({ message: "Invalid Midtrans notification signature." }, { status: 401 });
  }

  const supabase = getServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required to process Midtrans notifications." },
      { status: 500 },
    );
  }

  const status = mapMidtransTransactionStatus(payload);
  const { data: order, error: orderError } = await supabase
    .from("subscription_orders")
    .select("merchant_order_id,email,organization_id,profile_id,plan_id,duration_months,device_count")
    .eq("merchant_order_id", payload.order_id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ message: orderError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("subscription_orders")
    .update({
      status,
      payment_reference: payload.transaction_id ?? null,
      payment_method: payload.payment_type ?? "snap",
      gateway_response: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("merchant_order_id", payload.order_id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (status === "paid" && order) {
    const activationError = await activatePaidSubscription(supabase, order);
    if (activationError) {
      return NextResponse.json({ message: activationError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "OK" });
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
