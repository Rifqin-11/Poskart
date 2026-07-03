import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordDuitkuPaymentLedgerEntry } from "@/server/payments/payment-ledger";
import {
  checkDuitkuTransactionStatus,
  mapDuitkuResultCode,
  mapDuitkuTransactionStatusCode,
  type DuitkuCallbackPayload,
  verifyDuitkuCallbackSignature,
} from "@/server/payments/duitku";
import { activatePaidSubscription } from "@/server/subscription/activation";

export async function POST(request: NextRequest) {
  const payload = await readDuitkuPayload(request);

  if (!payload?.merchantOrderId) {
    return NextResponse.json(
      { message: "Invalid Duitku callback payload." },
      { status: 400 },
    );
  }

  if (!verifyDuitkuCallbackSignature(payload)) {
    return NextResponse.json(
      { message: "Invalid Duitku callback signature." },
      { status: 401 },
    );
  }

  const supabase = createSupabaseAdminClient();

  const status = mapDuitkuResultCode(payload.resultCode);
  const { data: order, error: orderError } = await supabase
    .from("subscription_orders")
    .select(
      "merchant_order_id,email,organization_id,profile_id,plan_id,duration_months,device_count",
    )
    .eq("merchant_order_id", payload.merchantOrderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ message: orderError.message }, { status: 500 });
  }

  if (order) {
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

    if (status === "paid") {
      const activationError = await activatePaidSubscription(supabase, order);
      if (activationError) {
        return NextResponse.json(
          { message: activationError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ message: "OK" });
  }

  const { data: transaction, error: transactionLookupError } = await supabase
    .from("transactions")
    .select(
      "id,organization_id,amount,provider,collection_mode,payment_gateway,merchant_order_id,payment_reference,booth,package_name,paid_at,created_at,gateway_response",
    )
    .eq("merchant_order_id", payload.merchantOrderId)
    .maybeSingle();

  if (transactionLookupError) {
    return NextResponse.json(
      { message: transactionLookupError.message },
      { status: 500 },
    );
  }

  const verifiedStatus = await checkDuitkuTransactionStatus(
    payload.merchantOrderId,
  );
  const verifiedMappedStatus = mapDuitkuTransactionStatusCode(
    verifiedStatus.statusCode,
  );
  const now = new Date().toISOString();
  const { error: transactionError } = await supabase
    .from("transactions")
    .update({
      status: verifiedMappedStatus,
      payment_reference:
        verifiedStatus.reference ?? payload.reference ?? transaction?.payment_reference ?? null,
      duitku_status_code: verifiedStatus.statusCode ?? payload.resultCode ?? null,
      duitku_status_message: verifiedStatus.statusMessage ?? verifiedMappedStatus,
      gateway_status_checked_at: now,
      gateway_response: {
        callback: payload,
        verified: verifiedStatus.raw,
      },
      paid_at: verifiedMappedStatus === "paid" ? now : null,
      updated_at: now,
    })
    .eq("merchant_order_id", payload.merchantOrderId);

  if (transactionError) {
    return NextResponse.json(
      { message: transactionError.message },
      { status: 500 },
    );
  }

  if (transaction && verifiedMappedStatus === "paid") {
    await recordDuitkuPaymentLedgerEntry(supabase, {
      transaction: {
        ...transaction,
        payment_reference:
          verifiedStatus.reference ?? payload.reference ?? transaction.payment_reference,
        paid_at: now,
        gateway_response: verifiedStatus.raw,
      },
      verifiedStatus,
      callbackPayload: payload,
    });
  }

  return NextResponse.json({ message: "OK" });
}

async function readDuitkuPayload(
  request: NextRequest,
): Promise<DuitkuCallbackPayload | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request
      .json()
      .catch(() => null)) as DuitkuCallbackPayload | null;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return null;

  return Object.fromEntries(formData.entries()) as DuitkuCallbackPayload;
}
