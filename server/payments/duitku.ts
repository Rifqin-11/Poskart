import crypto from "node:crypto";

import { businessProfile, type PricingPlan } from "@/lib/constants/business";

const SANDBOX_CREATE_INVOICE_URL = "https://api-sandbox.duitku.com/api/merchant/createInvoice";
const PRODUCTION_CREATE_INVOICE_URL = "https://api-prod.duitku.com/api/merchant/createInvoice";
const SANDBOX_POP_SCRIPT_URL = "https://app-sandbox.duitku.com/lib/js/duitku.js";
const PRODUCTION_POP_SCRIPT_URL = "https://app-prod.duitku.com/lib/js/duitku.js";

export type DuitkuInquiryResult = {
  merchantOrderId: string;
  reference?: string;
  paymentUrl?: string;
  popScriptUrl: string;
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
    createInvoiceUrl: sandbox ? SANDBOX_CREATE_INVOICE_URL : PRODUCTION_CREATE_INVOICE_URL,
    popScriptUrl: sandbox ? SANDBOX_POP_SCRIPT_URL : PRODUCTION_POP_SCRIPT_URL,
  };
}

export function createMerchantOrderId() {
  return `PK${Date.now()}${crypto.randomBytes(4).toString("hex")}`;
}

export async function createDuitkuPayment(input: CreateDuitkuPaymentInput): Promise<DuitkuInquiryResult> {
  const config = getDuitkuConfig();

  if (!config) {
    throw new Error("Duitku belum dikonfigurasi. Isi DUITKU_MERCHANT_CODE dan DUITKU_API_KEY.");
  }

  const timestamp = Date.now().toString();
  const signature = createCreateInvoiceSignature(config.merchantCode, timestamp, config.apiKey);

  const body = {
    paymentAmount: input.amount,
    merchantOrderId: input.merchantOrderId,
    productDetails: `POSKART ${input.plan.name} Subscription`,
    additionalParam: "",
    merchantUserInfo: input.email,
    paymentMethod: config.paymentMethod,
    customerVaName: input.customerName.slice(0, 20),
    email: input.email,
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
    expiryPeriod: 60,
  };

  if (input.phoneNumber) {
    Object.assign(body, { phoneNumber: input.phoneNumber });
    Object.assign(body.customerDetail, { phoneNumber: input.phoneNumber });
  }

  const response = await fetch(config.createInvoiceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-duitku-merchantcode": config.merchantCode,
      "x-duitku-signature": signature,
      "x-duitku-timestamp": timestamp,
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
    popScriptUrl: config.popScriptUrl,
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

  const hmacExpected = createHmacSha256Signature(`${merchantCode}${amount}${merchantOrderId}`, config.apiKey);
  const md5Expected = createMd5Signature(`${merchantCode}${amount}${merchantOrderId}${config.apiKey}`);

  return timingSafeEqual(hmacExpected, signature) || timingSafeEqual(md5Expected, signature);
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

function createCreateInvoiceSignature(merchantCode: string, timestamp: string, apiKey: string) {
  return createHmacSha256Signature(`${merchantCode}${timestamp}`, apiKey);
}

function createHmacSha256Signature(value: string, apiKey: string) {
  return crypto.createHmac("sha256", apiKey).update(value).digest("hex");
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
