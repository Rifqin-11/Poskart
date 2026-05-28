import crypto from "node:crypto";

import type { PricingPlan } from "@/lib/constants/business";

const SANDBOX_SNAP_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const PRODUCTION_SNAP_URL = "https://app.midtrans.com/snap/v1/transactions";

export type MidtransSnapResult = {
  token?: string;
  paymentUrl: string;
  raw: Record<string, unknown>;
};

export type MidtransNotificationPayload = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
  payment_type?: string;
  signature_key?: string;
};

type CreateMidtransPaymentInput = {
  merchantOrderId: string;
  amount: number;
  plan: PricingPlan;
  customerName: string;
  email: string;
  phoneNumber?: string;
  deviceCount: number;
  returnUrl: string;
};

export function getMidtransConfig() {
  const merchantId = process.env.MIDTRANS_MERCHANT_ID?.trim();
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim();
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  const sandbox = process.env.MIDTRANS_SANDBOX !== "false";

  if (!merchantId || !clientKey || !serverKey) {
    return null;
  }

  return {
    merchantId,
    clientKey,
    serverKey,
    snapUrl: sandbox ? SANDBOX_SNAP_URL : PRODUCTION_SNAP_URL,
  };
}

export async function createMidtransPayment(
  input: CreateMidtransPaymentInput,
): Promise<MidtransSnapResult> {
  const config = getMidtransConfig();

  if (!config) {
    throw new Error(
      "Midtrans Sandbox belum dikonfigurasi. Isi MIDTRANS_MERCHANT_ID, NEXT_PUBLIC_MIDTRANS_CLIENT_KEY, dan MIDTRANS_SERVER_KEY.",
    );
  }

  const body = {
    transaction_details: {
      order_id: input.merchantOrderId,
      gross_amount: input.amount,
    },
    item_details: [
      {
        id: input.plan.id,
        price: input.amount,
        quantity: 1,
        name: `POSKART ${input.plan.name} (${input.deviceCount} device)`.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: input.customerName.slice(0, 255),
      email: input.email,
      phone: input.phoneNumber,
    },
    callbacks: {
      finish: input.returnUrl,
    },
    expiry: {
      unit: "minutes",
      duration: 60,
    },
  };

  const response = await fetch(config.snapUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(getMidtransMessage(raw) || `Midtrans request failed with HTTP ${response.status}.`);
  }

  const paymentUrl = getString(raw.redirect_url);

  if (!paymentUrl) {
    throw new Error(getMidtransMessage(raw) || "Midtrans tidak mengembalikan redirect_url.");
  }

  return {
    token: getString(raw.token) ?? undefined,
    paymentUrl,
    raw,
  };
}

export function verifyMidtransNotificationSignature(payload: MidtransNotificationPayload) {
  const config = getMidtransConfig();
  const orderId = payload.order_id;
  const statusCode = payload.status_code;
  const grossAmount = payload.gross_amount;
  const signature = payload.signature_key;

  if (!config || !orderId || !statusCode || !grossAmount || !signature) {
    return false;
  }

  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${config.serverKey}`)
    .digest("hex");

  return timingSafeEqual(expected, signature);
}

export function mapMidtransTransactionStatus(payload: MidtransNotificationPayload) {
  if (payload.transaction_status === "settlement") return "paid" as const;
  if (payload.transaction_status === "capture" && payload.fraud_status !== "challenge") {
    return "paid" as const;
  }
  if (payload.transaction_status === "pending") return "pending" as const;
  if (
    payload.transaction_status === "deny" ||
    payload.transaction_status === "expire" ||
    payload.transaction_status === "cancel" ||
    payload.transaction_status === "failure"
  ) {
    return "failed" as const;
  }
  return "pending" as const;
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMidtransMessage(raw: Record<string, unknown>) {
  const messages = raw.error_messages;
  if (Array.isArray(messages)) {
    return messages.filter((item): item is string => typeof item === "string").join(" ");
  }

  return getString(raw.status_message) || getString(raw.message);
}
