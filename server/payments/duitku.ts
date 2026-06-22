import crypto from "node:crypto";

import { businessProfile, type PricingPlan } from "@/lib/constants/business";

const SANDBOX_CREATE_INVOICE_URL =
  "https://api-sandbox.duitku.com/api/merchant/createInvoice";
const PRODUCTION_CREATE_INVOICE_URL =
  "https://api-prod.duitku.com/api/merchant/createInvoice";
const SANDBOX_DIRECT_INQUIRY_URL =
  "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry";
const PRODUCTION_DIRECT_INQUIRY_URL =
  "https://passport.duitku.com/webapi/api/merchant/v2/inquiry";
const SANDBOX_TRANSACTION_STATUS_URL =
  "https://sandbox.duitku.com/webapi/api/merchant/transactionStatus";
const PRODUCTION_TRANSACTION_STATUS_URL =
  "https://passport.duitku.com/webapi/api/merchant/transactionStatus";
const SANDBOX_POP_SCRIPT_URL =
  "https://app-sandbox.duitku.com/lib/js/duitku.js";
const PRODUCTION_POP_SCRIPT_URL =
  "https://app-prod.duitku.com/lib/js/duitku.js";

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

export type DuitkuDirectPaymentResult = {
  merchantOrderId: string;
  reference?: string;
  paymentUrl?: string;
  qrString: string;
  amount?: number;
  statusCode?: string;
  statusMessage?: string;
  paymentMethod: string;
  expiresAt: string;
  raw: Record<string, unknown>;
};

export type DuitkuTransactionStatusResult = {
  merchantOrderId: string;
  reference?: string;
  amount?: number;
  fee?: string;
  statusCode?: string;
  statusMessage?: string;
  raw: Record<string, unknown>;
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

type CreateDuitkuDirectPaymentInput = {
  merchantOrderId: string;
  amount: number;
  productDetails: string;
  customerName: string;
  email: string;
  phoneNumber?: string;
  returnUrl: string;
  callbackUrl: string;
  expiryPeriodMinutes?: number;
  paymentMethod?: string;
};

export function getDuitkuConfig() {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE?.trim();
  const apiKey = process.env.DUITKU_API_KEY?.trim();
  const sandbox = process.env.DUITKU_SANDBOX !== "false";
  const paymentMethod = process.env.DUITKU_PAYMENT_METHOD?.trim() || "SQ";

  if (!merchantCode || !apiKey) {
    return null;
  }

  return {
    merchantCode,
    apiKey,
    paymentMethod,
    createInvoiceUrl: sandbox
      ? SANDBOX_CREATE_INVOICE_URL
      : PRODUCTION_CREATE_INVOICE_URL,
    directInquiryUrl: sandbox
      ? SANDBOX_DIRECT_INQUIRY_URL
      : PRODUCTION_DIRECT_INQUIRY_URL,
    transactionStatusUrl: sandbox
      ? SANDBOX_TRANSACTION_STATUS_URL
      : PRODUCTION_TRANSACTION_STATUS_URL,
    popScriptUrl: sandbox ? SANDBOX_POP_SCRIPT_URL : PRODUCTION_POP_SCRIPT_URL,
  };
}

export function getDuitkuQrisPaymentMethod() {
  return (
    process.env.DUITKU_KIOSK_PAYMENT_METHOD?.trim() ||
    process.env.DUITKU_QRIS_PAYMENT_METHOD?.trim() ||
    "SQ"
  );
}

export function createMerchantOrderId() {
  return `PK${Date.now()}${crypto.randomBytes(4).toString("hex")}`;
}

export async function createDuitkuPayment(
  input: CreateDuitkuPaymentInput,
): Promise<DuitkuInquiryResult> {
  const config = getDuitkuConfig();

  if (!config) {
    throw new Error(
      "Duitku belum dikonfigurasi. Isi DUITKU_MERCHANT_CODE dan DUITKU_API_KEY.",
    );
  }

  const timestamp = Date.now().toString();
  const signature = createCreateInvoiceSignature(
    config.merchantCode,
    timestamp,
    config.apiKey,
  );

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

  const raw = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      getDuitkuMessage(raw) ||
      `Duitku request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const paymentUrl = getString(raw.paymentUrl) || getString(raw.payment_url);
  const reference = getString(raw.reference);

  if (!paymentUrl) {
    throw new Error(
      getDuitkuMessage(raw) || "Duitku tidak mengembalikan payment URL.",
    );
  }

  return {
    merchantOrderId: input.merchantOrderId,
    reference: reference ?? undefined,
    paymentUrl,
    popScriptUrl: config.popScriptUrl,
    raw,
  };
}

export async function createDuitkuDirectPayment(
  input: CreateDuitkuDirectPaymentInput,
): Promise<DuitkuDirectPaymentResult> {
  const config = getDuitkuConfig();

  if (!config) {
    throw new Error(
      "Duitku belum dikonfigurasi. Isi DUITKU_MERCHANT_CODE dan DUITKU_API_KEY.",
    );
  }

  const paymentAmount = Math.max(0, Math.round(input.amount));
  const paymentMethod =
    input.paymentMethod?.trim() || getDuitkuQrisPaymentMethod();
  const expiryPeriod = Math.min(
    60,
    Math.max(1, Math.round(input.expiryPeriodMinutes ?? 10)),
  );
  const signature = createHmacSha256Signature(
    `${config.merchantCode}${input.merchantOrderId}${paymentAmount}`,
    config.apiKey,
  );
  const customerName = input.customerName.trim() || "POSKART";

  const body = {
    merchantCode: config.merchantCode,
    paymentAmount,
    paymentMethod,
    merchantOrderId: input.merchantOrderId,
    productDetails: input.productDetails.slice(0, 255),
    additionalParam: "",
    merchantUserInfo: input.email,
    customerVaName: customerName.slice(0, 20),
    email: input.email,
    itemDetails: [
      {
        name: input.productDetails.slice(0, 255),
        price: paymentAmount,
        quantity: 1,
      },
    ],
    customerDetail: {
      firstName: customerName,
      email: input.email,
      ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
    },
    callbackUrl: input.callbackUrl,
    returnUrl: input.returnUrl,
    signature,
    expiryPeriod,
    ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
  };

  const response = await fetch(config.directInquiryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      getDuitkuMessage(raw) ||
      `Duitku request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const qrString = getString(raw.qrString) || getString(raw.qr_string);
  const reference = getString(raw.reference);
  const paymentUrl = getString(raw.paymentUrl) || getString(raw.payment_url);
  const statusCode = getString(raw.statusCode);

  if (statusCode && statusCode !== "00") {
    throw new Error(
      getDuitkuMessage(raw) || "Duitku tidak berhasil membuat transaksi QRIS.",
    );
  }

  if (!qrString) {
    throw new Error(
      getDuitkuMessage(raw) ||
        "Duitku tidak mengembalikan QR string untuk metode QRIS.",
    );
  }

  return {
    merchantOrderId: input.merchantOrderId,
    reference: reference ?? undefined,
    paymentUrl: paymentUrl ?? undefined,
    qrString,
    amount: getNumber(raw.amount) ?? paymentAmount,
    statusCode: statusCode ?? undefined,
    statusMessage: getString(raw.statusMessage) ?? undefined,
    paymentMethod,
    expiresAt: new Date(Date.now() + expiryPeriod * 60_000).toISOString(),
    raw,
  };
}

export async function checkDuitkuTransactionStatus(
  merchantOrderId: string,
): Promise<DuitkuTransactionStatusResult> {
  const config = getDuitkuConfig();

  if (!config) {
    throw new Error(
      "Duitku belum dikonfigurasi. Isi DUITKU_MERCHANT_CODE dan DUITKU_API_KEY.",
    );
  }

  const signature = createHmacSha256Signature(
    `${config.merchantCode}${merchantOrderId}`,
    config.apiKey,
  );
  const response = await fetch(config.transactionStatusUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      merchantCode: config.merchantCode,
      merchantOrderId,
      signature,
    }),
    cache: "no-store",
  });

  const raw = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      getDuitkuMessage(raw) ||
      `Duitku status request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return {
    merchantOrderId: getString(raw.merchantOrderId) ?? merchantOrderId,
    reference: getString(raw.reference) ?? undefined,
    amount: getNumber(raw.amount) ?? undefined,
    fee: getString(raw.fee) ?? undefined,
    statusCode: getString(raw.statusCode) ?? undefined,
    statusMessage: getString(raw.statusMessage) ?? undefined,
    raw,
  };
}

export function verifyDuitkuCallbackSignature(payload: DuitkuCallbackPayload) {
  const config = getDuitkuConfig();
  const merchantCode = payload.merchantCode;
  const amount = payload.amount;
  const merchantOrderId = payload.merchantOrderId;
  const signature = payload.signature;

  if (
    !config ||
    !merchantCode ||
    amount == null ||
    !merchantOrderId ||
    !signature
  ) {
    return false;
  }

  const hmacExpected = createHmacSha256Signature(
    `${merchantCode}${amount}${merchantOrderId}`,
    config.apiKey,
  );
  const md5Expected = createMd5Signature(
    `${merchantCode}${amount}${merchantOrderId}${config.apiKey}`,
  );

  return (
    timingSafeEqual(hmacExpected, signature) ||
    timingSafeEqual(md5Expected, signature)
  );
}

export function mapDuitkuResultCode(resultCode?: string) {
  if (resultCode === "00") return "paid" as const;
  if (resultCode === "01") return "failed" as const;
  return "pending" as const;
}

export function mapDuitkuTransactionStatusCode(statusCode?: string) {
  if (statusCode === "00") return "paid" as const;
  if (statusCode === "02") return "failed" as const;
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

function createCreateInvoiceSignature(
  merchantCode: string,
  timestamp: string,
  apiKey: string,
) {
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

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getDuitkuMessage(raw: Record<string, unknown>) {
  return (
    getString(raw.Message) ||
    getString(raw.message) ||
    getString(raw.errorMessage) ||
    getString(raw.statusMessage)
  );
}
