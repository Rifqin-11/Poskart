import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import {
  mapMidtransTransactionStatus,
  type MidtransNotificationPayload,
  verifyMidtransNotificationSignature,
} from "@/server/payments/midtrans";
import { reconcileSubscriptionPayment } from "@/server/subscription/payment-reconciliation";

export async function POST(request: NextRequest) {
  const payload = (await request
    .json()
    .catch(() => null)) as MidtransNotificationPayload | null;

  if (!payload?.order_id) {
    return NextResponse.json(
      { message: "Invalid Midtrans notification payload." },
      { status: 400 },
    );
  }

  if (!verifyMidtransNotificationSignature(payload)) {
    return NextResponse.json(
      { message: "Invalid Midtrans notification signature." },
      { status: 401 },
    );
  }

  const supabase = getServiceClient();

  if (!supabase) {
    return NextResponse.json(
      {
        message:
          "SUPABASE_SERVICE_ROLE_KEY is required to process Midtrans notifications.",
      },
      { status: 500 },
    );
  }

  const status = mapMidtransTransactionStatus(payload);
  const { data: order, error: orderError } = await supabase
    .from("subscription_orders")
    .select(
      "merchant_order_id,amount,payment_gateway,status",
    )
    .eq("merchant_order_id", payload.order_id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ message: orderError.message }, { status: 500 });
  }

  if (!order) return NextResponse.json({ message: "OK" });
  if (order.payment_gateway !== "midtrans" || Number(payload.gross_amount) !== Number(order.amount)) {
    return NextResponse.json({ message: "Payment details do not match the subscription order." }, { status: 400 });
  }
  try {
    await reconcileSubscriptionPayment(supabase, {
      merchantOrderId: payload.order_id,
      status,
      reference: payload.transaction_id,
      paymentMethod: payload.payment_type ?? "snap",
      response: payload,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Payment reconciliation failed." }, { status: 500 });
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
