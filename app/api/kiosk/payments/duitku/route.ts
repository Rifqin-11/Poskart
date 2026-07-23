import {
  jsonError,
  jsonOk,
  type KioskRequestContext,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordDuitkuPaymentLedgerEntry } from "@/server/payments/payment-ledger";
import { resolveDuitkuRuntimeConfigForOrganization } from "@/server/payments/organization-gateway";
import {
  checkDuitkuTransactionStatus,
  createDuitkuDirectPayment,
  createMerchantOrderId,
  mapDuitkuTransactionStatusCode,
} from "@/server/payments/duitku";
import { resolveKioskPricingProduct } from "@/lib/kiosk/pricing";
import { isDuitkuTransactionPaid } from "@/server/payments/qris-status";

type CreatePaymentBody = {
  deviceId?: string;
  sessionId?: string;
  packageCode?: string;
  packageName?: string;
  amount?: number;
  printCount?: number;
  templateId?: string | null;
  customerName?: string | null;
};

type CancelPaymentBody = {
  deviceId?: string;
  sessionId?: string;
  action?: "cancel";
};

type TransactionRow = {
  id: string;
  organization_id: string | null;
  status: "paid" | "pending" | "failed" | "refunded" | "cancelled";
  amount: number;
  provider: string | null;
  collection_mode: string | null;
  payment_gateway: string | null;
  merchant_order_id: string | null;
  payment_reference: string | null;
  duitku_qr_string: string | null;
  payment_expires_at: string | null;
  gateway_status_checked_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  booth: string | null;
  package_name: string | null;
  duitku_status_code: string | null;
  gateway_response: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as CreatePaymentBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const sessionId = body.sessionId?.trim() ?? "";
    const packageCode =
      body.packageCode?.trim() || body.packageName?.trim() || "";

    if (!sessionId || !packageCode) {
      return jsonOk(
        {
          error: "Session ID and package code are required.",
          code: "KIOSK_DUITKU_PAYMENT_INVALID",
        },
        { status: 400 },
      );
    }

    const product = await resolveKioskPricingProduct(
      context,
      device,
      packageCode,
    );
    if (product.accessMode === "event") {
      return jsonOk(
        {
          error: "Event access does not use QRIS payment.",
          code: "KIOSK_EVENT_PAYMENT_NOT_ALLOWED",
        },
        { status: 400 },
      );
    }

    const existing = await loadTransaction(context, sessionId);
    if (existing && isDuitkuTransactionPaid(existing)) {
      return jsonOk({
        status: "paid",
        sessionId,
        merchantOrderId: existing.merchant_order_id,
        reference: existing.payment_reference,
        qrString: existing.duitku_qr_string,
        amount: existing.amount,
        expiresAt: existing.payment_expires_at,
      });
    }

    if (
      existing?.status === "pending" &&
      existing.duitku_qr_string &&
      !isExpired(existing)
    ) {
      return jsonOk({
        status: "pending",
        sessionId,
        merchantOrderId: existing.merchant_order_id,
        reference: existing.payment_reference,
        qrString: existing.duitku_qr_string,
        amount: existing.amount,
        expiresAt: existing.payment_expires_at,
      });
    }

    const collectionMode = await resolveOrganizationCollectionMode(context);
    const adminClient = createSupabaseAdminClient();
    const duitkuConfig = await resolveDuitkuRuntimeConfigForOrganization(
      adminClient,
      {
        organizationId: context.organizationId,
        collectionMode,
      },
    );

    const siteUrl = getSiteUrl(request);
    const merchantOrderId = createMerchantOrderId();
    const payment = await createDuitkuDirectPayment(
      {
        merchantOrderId,
        amount: product.amount,
        productDetails: `POSKART ${product.name}`,
        customerName: body.customerName?.trim() || "POSKART Customer",
        email: context.user.email ?? "kiosk@poskart.my.id",
        callbackUrl: `${siteUrl}/api/payments/duitku/callback`,
        returnUrl: `${siteUrl}/api/kiosk/payments/duitku/return`,
        expiryPeriodMinutes: 10,
      },
      duitkuConfig,
    );

    const now = new Date().toISOString();
    const templateId = body.templateId?.trim() || null;
    const { error } = await context.client.from("transactions").upsert({
      id: sessionId,
      organization_id: context.organizationId,
      booth: device.name,
      location: device.location,
      customer: body.customerName?.trim() || "Walk-in",
      package_name: product.name,
      amount: product.amount,
      status: "pending",
      provider: "QRIS",
      collection_mode: collectionMode,
      payment_gateway: "duitku",
      merchant_order_id: payment.merchantOrderId,
      payment_reference: payment.reference ?? null,
      payment_url: payment.paymentUrl ?? null,
      duitku_qr_string: payment.qrString,
      duitku_status_code: payment.statusCode ?? null,
      duitku_status_message: payment.statusMessage ?? null,
      payment_expires_at: payment.expiresAt,
      gateway_response: payment.raw,
      template_id: templateId,
      // A paid package grants an allowance, but is not proof that a print was
      // completed. Successful printer events increment this separately.
      print_count: 0,
      created_at_label: now,
      print_status: "pending",
      print_attempts: 0,
      print_last_error: null,
      updated_at: now,
    });

    if (error) throw error;

    return jsonOk(
      {
        status: "pending",
        sessionId,
        merchantOrderId: payment.merchantOrderId,
        reference: payment.reference ?? null,
        qrString: payment.qrString,
        amount: product.amount,
        expiresAt: payment.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") ?? "";
    const sessionId = searchParams.get("sessionId") ?? "";
    await requireOrganizationDevice(context, deviceId);

    if (!sessionId.trim()) {
      return jsonOk(
        {
          error: "Session ID is required.",
          code: "KIOSK_DUITKU_STATUS_INVALID",
        },
        { status: 400 },
      );
    }

    const transaction = await loadTransaction(context, sessionId.trim());
    if (!transaction) {
      return jsonOk(
        {
          error: "Payment transaction was not found.",
          code: "KIOSK_DUITKU_PAYMENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (transaction.status === "pending" && shouldRefreshStatus(transaction)) {
      const refreshed = await refreshTransactionStatus(context, transaction);
      return jsonOk(refreshed);
    }

    return jsonOk(formatStatus(transaction));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as CancelPaymentBody;
    await requireOrganizationDevice(context, body.deviceId ?? "");

    const sessionId = body.sessionId?.trim() ?? "";
    if (!sessionId || body.action !== "cancel") {
      return jsonOk(
        {
          error: "A payment session ID is required to cancel QRIS.",
          code: "KIOSK_DUITKU_CANCEL_INVALID",
        },
        { status: 400 },
      );
    }

    const transaction = await loadTransaction(context, sessionId);
    if (!transaction) {
      return jsonOk(
        {
          error: "Payment transaction was not found.",
          code: "KIOSK_DUITKU_PAYMENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (
      transaction.provider !== "QRIS" ||
      transaction.payment_gateway !== "duitku"
    ) {
      return jsonOk(
        {
          error: "Only Duitku QRIS payments can be cancelled.",
          code: "KIOSK_DUITKU_CANCEL_NOT_ALLOWED",
        },
        { status: 409 },
      );
    }

    if (transaction.status !== "pending") {
      return jsonOk(formatStatus(transaction));
    }

    // Keep the update conditional so a concurrent Duitku callback cannot be
    // overwritten after it has already finalized the payment.
    const { data, error } = await context.client
      .from("transactions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .eq("organization_id", context.organizationId)
      .eq("status", "pending")
      .select(
        "id,organization_id,status,amount,provider,collection_mode,payment_gateway,merchant_order_id,payment_reference,duitku_qr_string,payment_expires_at,gateway_status_checked_at,paid_at,created_at,booth,package_name,duitku_status_code,gateway_response",
      )
      .maybeSingle();

    if (error) throw error;
    if (data) return jsonOk(formatStatus(data as TransactionRow));

    const latest = await loadTransaction(context, sessionId);
    if (!latest) {
      return jsonOk(
        {
          error: "Payment transaction was not found.",
          code: "KIOSK_DUITKU_PAYMENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }
    return jsonOk(formatStatus(latest));
  } catch (error) {
    return jsonError(error);
  }
}

async function resolveOrganizationCollectionMode(context: KioskRequestContext) {
  const { data } = await context.client
    .from("organizations")
    .select("payment_collection_mode")
    .eq("id", context.organizationId)
    .maybeSingle();

  return data?.payment_collection_mode === "custom" ? "custom" : "platform";
}

async function loadTransaction(
  context: KioskRequestContext,
  sessionId: string,
) {
  const { data, error } = await context.client
    .from("transactions")
    .select(
      "id,organization_id,status,amount,provider,collection_mode,payment_gateway,merchant_order_id,payment_reference,duitku_qr_string,payment_expires_at,gateway_status_checked_at,paid_at,created_at,booth,package_name,duitku_status_code,gateway_response",
    )
    .eq("organization_id", context.organizationId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as TransactionRow | null;
}

async function refreshTransactionStatus(
  context: KioskRequestContext,
  transaction: TransactionRow,
) {
  if (!transaction.merchant_order_id) return formatStatus(transaction);

  const adminClient = createSupabaseAdminClient();
  const duitkuConfig = await resolveDuitkuRuntimeConfigForOrganization(
    adminClient,
    {
      organizationId: transaction.organization_id,
      collectionMode: transaction.collection_mode,
    },
  );
  const status = await checkDuitkuTransactionStatus(
    transaction.merchant_order_id,
    duitkuConfig,
  );
  const mappedStatus = mapDuitkuTransactionStatusCode(status.statusCode);
  const now = new Date().toISOString();
  const { data, error } = await context.client
    .from("transactions")
    .update({
      status: mappedStatus,
      payment_reference: status.reference ?? transaction.payment_reference,
      duitku_status_code: status.statusCode ?? null,
      duitku_status_message: status.statusMessage ?? null,
      gateway_status_checked_at: now,
      gateway_response: status.raw,
      paid_at: mappedStatus === "paid" ? now : null,
      updated_at: now,
    })
    .eq("id", transaction.id)
    .eq("organization_id", context.organizationId)
    .select(
      "id,organization_id,status,amount,provider,collection_mode,payment_gateway,merchant_order_id,payment_reference,duitku_qr_string,payment_expires_at,gateway_status_checked_at,paid_at,created_at,booth,package_name,duitku_status_code,gateway_response",
    )
    .single();

  if (error) throw error;
  if (mappedStatus === "paid") {
    await recordDuitkuPaymentLedgerEntry(adminClient, {
      transaction: data as TransactionRow,
      verifiedStatus: status,
    });
  }
  return formatStatus(data as TransactionRow);
}

function shouldRefreshStatus(transaction: TransactionRow) {
  if (isExpired(transaction)) return true;

  const lastChecked = transaction.gateway_status_checked_at
    ? Date.parse(transaction.gateway_status_checked_at)
    : null;
  if (!lastChecked || !Number.isFinite(lastChecked)) return true;
  return Date.now() - lastChecked > 12_000;
}

function isExpired(transaction: TransactionRow) {
  const expiresAt = transaction.payment_expires_at
    ? Date.parse(transaction.payment_expires_at)
    : null;
  return Boolean(
    expiresAt && Number.isFinite(expiresAt) && expiresAt <= Date.now(),
  );
}

function formatStatus(transaction: TransactionRow) {
  const normalizedStatus = isDuitkuTransactionPaid(transaction)
    ? "paid"
    : transaction.status;

  return {
    sessionId: transaction.id,
    // An expired local QR code remains pending until Duitku explicitly reports
    // its terminal result. Only Duitku's verified failed status becomes failed.
    status: normalizedStatus,
    merchantOrderId: transaction.merchant_order_id,
    reference: transaction.payment_reference,
    qrString: transaction.duitku_qr_string,
    amount: transaction.amount,
    expiresAt: transaction.payment_expires_at,
  };
}

function getSiteUrl(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
