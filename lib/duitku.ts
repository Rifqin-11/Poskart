import crypto from "node:crypto";

import { businessProfile, type PricingPlan } from "@/lib/constants/business";

const SANDBOX_INQUIRY_URL = "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry";
const PRODUCTION_INQUIRY_URL = "https://passport.duitku.com/webapi/api/merchant/v2/inquiry";

export type DuitkuInquiryResult = {
  merchantOrderId: string;
  reference?: string;
  paymentUrl?: string;
  raw: Record<string, unknown>;
};

export type DuitkuCallbackPayload = {
  merchantCode?: string;
  amount?: string | number;
  merchantOrderId?: string;
  productDetail?: string;
  additionalParam?: string;
  paymentCode?: string;
  resultCode?: string;
  merchantUserId?: string;
  reference?: string;
  signature?: string;
};

type CreateDuitkuPaymentInput = {
  merchantOrderId: string;
  amount: number;
  plan: PricingPlan;
  customerName: string;
  email: string;
  phoneNumber?: string;
  deviceCount: number;
  returnUrl: string;
  callbackUrl: string;
};

export function getDuitkuConfig() {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE?.trim();
  const apiKey = process.env.DUITKU_API_KEY?.trim();
  const sandbox = process.env.DUITKU_SANDBOX !== "false";
  const paymentMethod = process.env.DUITKU_PAYMENT_METHOD?.trim() || "VC";

  if (!merchantCode || !apiKey) {
    return null;
  }

  return {
    merchantCode,
    apiKey,
    paymentMethod,
    inquiryUrl: sandbox ? SANDBOX_INQUIRY_URL : PRODUCTION_INQUIRY_URL,
  };
}

export function createMerchantOrderId() {
  return `PK${Date.now()}${crypto.randomBytes(4).toString("hex")}`;
}

export async function createDuitkuPayment(input: CreateDuitkuPaymentInput): Promise<DuitkuInquiryResult> {
  const config = getDuitkuConfig();

  if (!config) {
    throw new Error("Duitku Sandbox belum dikonfigurasi. Isi DUITKU_MERCHANT_CODE dan DUITKU_API_KEY.");
  }

  const signature = createInquirySignature(
    config.merchantCode,
    input.merchantOrderId,
    input.amount,
    config.apiKey,
  );

  const body = {
    merchantCode: config.merchantCode,
    paymentAmount: input.amount,
    paymentMethod: config.paymentMethod,
    merchantOrderId: input.merchantOrderId,
    productDetails: `POSKART ${input.plan.name} Subscription`,
    email: input.email,
    merchantUserInfo: input.email,
    customerVaName: input.customerName.slice(0, 20),
    itemDetails: [
      {
        name: `${input.plan.name} Subscription (${input.deviceCount} device)`,
        price: input.amount,
        quantity: 1,
      },
    ],
    customerDetail: {
      firstName: input.customerName,
      email: input.email,
    },
    returnUrl: input.returnUrl,
    callbackUrl: input.callbackUrl,
    signature,
    expiryPeriod: 60,
  };

  if (input.phoneNumber) {
    Object.assign(body, { phoneNumber: input.phoneNumber });
    Object.assign(body.customerDetail, { phoneNumber: input.phoneNumber });
  }

  const response = await fetch(config.inquiryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const message = getDuitkuMessage(raw) || `Duitku request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const paymentUrl = getString(raw.paymentUrl) || getString(raw.payment_url);
  const reference = getString(raw.reference);

  if (!paymentUrl) {
    throw new Error(getDuitkuMessage(raw) || "Duitku tidak mengembalikan payment URL.");
  }

  return {
    merchantOrderId: input.merchantOrderId,
    reference: reference ?? undefined,
    paymentUrl,
    raw,
  };
}

export function verifyDuitkuCallbackSignature(payload: DuitkuCallbackPayload) {
  const config = getDuitkuConfig();
  const merchantCode = payload.merchantCode;
  const amount = payload.amount;
  const merchantOrderId = payload.merchantOrderId;
  const signature = payload.signature;

  if (!config || !merchantCode || amount == null || !merchantOrderId || !signature) {
    return false;
  }

  const expected = createMd5Signature(`${merchantCode}${amount}${merchantOrderId}${config.apiKey}`);

  return timingSafeEqual(expected, signature);
}

export function mapDuitkuResultCode(resultCode?: string) {
  if (resultCode === "00") return "paid" as const;
  if (resultCode === "01") return "failed" as const;
  return "pending" as const;
}

export function getDuitkuSupportSummary() {
  return {
    gatewayUsage:
      "Duitku digunakan untuk pembayaran subscription POSKART dari pelanggan POSKART ke POSKART. Transaksi end-customer milik client di dalam kiosk tetap dikelola sesuai konfigurasi merchant/client masing-masing.",
    supportEmail: businessProfile.email,
    supportPhone: businessProfile.phone,
    supportAddress: businessProfile.address,
  };
}

function createInquirySignature(
  merchantCode: string,
  merchantOrderId: string,
  paymentAmount: number,
  apiKey: string,
) {
  return createMd5Signature(`${merchantCode}${merchantOrderId}${paymentAmount}${apiKey}`);
}

function createMd5Signature(value: string) {
  return crypto.createHash("md5").update(value).digest("hex");
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDuitkuMessage(raw: Record<string, unknown>) {
  return (
    getString(raw.Message) ||
    getString(raw.message) ||
    getString(raw.errorMessage) ||
    getString(raw.statusMessage)
  );
}
