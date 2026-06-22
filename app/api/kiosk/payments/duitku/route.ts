import {
  jsonError,
  jsonOk,
  type KioskRequestContext,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import {
  checkDuitkuTransactionStatus,
  createDuitkuDirectPayment,
  createMerchantOrderId,
  mapDuitkuTransactionStatusCode,
} from "@/server/payments/duitku";

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

type TransactionRow = {
  id: string;
  status: "paid" | "pending" | "failed" | "refunded";
  amount: number;
  merchant_order_id: string | null;
  payment_reference: string | null;
  duitku_qr_string: string | null;
  payment_expires_at: string | null;
  gateway_status_checked_at: string | null;
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
    const packageName = body.packageName?.trim() ?? "";
    const amount = Math.max(0, Math.round(body.amount ?? 0));
    const printCount = Math.max(1, Math.round(body.printCount ?? 1));

    if (!sessionId || !packageName || amount <= 0) {
      return jsonOk(
        {
          error: "Session ID, package name, and amount are required.",
          code: "KIOSK_DUITKU_PAYMENT_INVALID",
        },
        { status: 400 },
      );
    }

    const existing = await loadTransaction(context, sessionId);
    if (existing && existing.status === "paid") {
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

    const siteUrl = getSiteUrl(request);
    const merchantOrderId = createMerchantOrderId();
    const payment = await createDuitkuDirectPayment({
      merchantOrderId,
      amount,
      productDetails: `POSKART ${packageName}`,
      customerName: body.customerName?.trim() || "POSKART Customer",
      email: context.user.email ?? "kiosk@poskart.my.id",
      callbackUrl: `${siteUrl}/api/payments/duitku/callback`,
      returnUrl: `${siteUrl}/api/kiosk/payments/duitku/return`,
      expiryPeriodMinutes: 10,
    });

    const now = new Date().toISOString();
    const templateId = body.templateId?.trim() || null;
    const { error } = await context.client.from("transactions").upsert({
      id: sessionId,
      organization_id: context.organizationId,
      booth: device.name,
      location: device.location,
      customer: body.customerName?.trim() || "Walk-in",
      package_name: packageName,
      amount,
      status: "pending",
      provider: "QRIS",
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
      print_count: printCount,
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
        amount,
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

async function loadTransaction(
  context: KioskRequestContext,
  sessionId: string,
) {
  const { data, error } = await context.client
    .from("transactions")
    .select(
      "id,status,amount,merchant_order_id,payment_reference,duitku_qr_string,payment_expires_at,gateway_status_checked_at",
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

  const status = await checkDuitkuTransactionStatus(
    transaction.merchant_order_id,
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
      "id,status,amount,merchant_order_id,payment_reference,duitku_qr_string,payment_expires_at,gateway_status_checked_at",
    )
    .single();

  if (error) throw error;
  return formatStatus(data as TransactionRow);
}

function shouldRefreshStatus(transaction: TransactionRow) {
  const expiresAt = transaction.payment_expires_at
    ? Date.parse(transaction.payment_expires_at)
    : null;
  if (expiresAt && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    return true;
  }

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
  const expiresAt = transaction.payment_expires_at;
  const expired = transaction.status === "pending" && isExpired(transaction);

  return {
    sessionId: transaction.id,
    status: expired ? "failed" : transaction.status,
    merchantOrderId: transaction.merchant_order_id,
    reference: transaction.payment_reference,
    qrString: transaction.duitku_qr_string,
    amount: transaction.amount,
    expiresAt,
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
