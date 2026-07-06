import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { resolveKioskPricingProduct } from "@/lib/kiosk/pricing";
import {
  isDuitkuTransactionPaid,
  normalizeQrisTransactionStatus,
} from "@/server/payments/qris-status";

type TransactionBody = {
  deviceId?: string;
  transaction?: {
    id?: string;
    customer?: string;
    packageCode?: string;
    packageName?: string;
    amount?: number;
    status?: TransactionStatus;
    provider?: "QRIS" | "Cash" | "Voucher";
    templateId?: string;
    printCount?: number;
    printStatus?: "pending" | "printed" | "failed" | "reprinting";
    printAttempts?: number;
    printLastError?: string | null;
  };
};

type TransactionStatus = "paid" | "pending" | "failed" | "refunded";

type ExistingTransaction = {
  status: TransactionStatus | null;
  paid_at: string | null;
  duitku_status_code: string | null;
  gateway_response: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as TransactionBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const transaction = body.transaction;

    if (
      !transaction?.id ||
      !(transaction.packageCode || transaction.packageName)
    ) {
      return jsonOk(
        {
          error: "Transaction ID and package code are required.",
          code: "KIOSK_TRANSACTION_INVALID",
        },
        { status: 400 },
      );
    }

    const product = await resolveKioskPricingProduct(
      context,
      device,
      transaction.packageCode?.trim() || transaction.packageName?.trim() || "",
    );

    const templateId = transaction.templateId?.trim() || null;
    if (templateId) {
      const { data: template, error: templateError } = await context.client
        .from("templates")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("id", templateId)
        .maybeSingle();
      if (templateError) throw templateError;
      if (!template) {
        return jsonOk(
          {
            error: "Template is not available for this organization.",
            code: "KIOSK_TEMPLATE_INVALID",
          },
          { status: 400 },
        );
      }
    }

    const { data: existingTransaction, error: existingTransactionError } =
      await context.client
        .from("transactions")
        .select("status,paid_at,duitku_status_code,gateway_response")
        .eq("organization_id", context.organizationId)
        .eq("id", transaction.id)
        .maybeSingle();

    if (existingTransactionError) throw existingTransactionError;

    const now = new Date().toISOString();
    const provider =
      transaction.provider === "Cash"
        ? "Cash"
        : transaction.provider === "Voucher"
          ? "Voucher"
          : "QRIS";
    if (
      provider === "QRIS" &&
      transaction.status === "paid" &&
      !existingTransaction
    ) {
      return jsonOk({
        success: true,
        transactionId: transaction.id,
        ignored: true,
        code: "KIOSK_QRIS_PAYMENT_TRANSACTION_NOT_FOUND",
      });
    }
    const status = resolveTransactionStatus({
      provider,
      requestedStatus: transaction.status,
      existingTransaction: (existingTransaction ??
        null) as ExistingTransaction | null,
    });
    const collectionMode = await resolveOrganizationCollectionMode(context);
    const { error: transactionError } = await context.client
      .from("transactions")
      .upsert({
        id: transaction.id,
        organization_id: context.organizationId,
        booth: device.name,
        location: device.location,
        customer: transaction.customer?.trim() || "Walk-in",
        package_name: product.name,
        amount: product.amount,
        status,
        provider,
        collection_mode: collectionMode,
        template_id: templateId,
        print_count: product.printCount,
        created_at_label: now,
        print_status: transaction.printStatus ?? "pending",
        print_attempts: Math.max(0, transaction.printAttempts ?? 0),
        print_last_error: transaction.printLastError ?? null,
        updated_at: now,
      });

    if (transactionError) throw transactionError;

    if (provider === "QRIS") {
      await restoreConfirmedQrisPaidStatus(
        context.client,
        context.organizationId,
        transaction.id,
      );
    }

    return jsonOk({ success: true, transactionId: transaction.id });
  } catch (error) {
    return jsonError(error);
  }
}

async function resolveOrganizationCollectionMode(
  context: Awaited<ReturnType<typeof requireKioskContext>>,
) {
  const { data } = await context.client
    .from("organizations")
    .select("payment_collection_mode")
    .eq("id", context.organizationId)
    .maybeSingle();

  return data?.payment_collection_mode === "custom" ? "custom" : "platform";
}

function resolveTransactionStatus({
  provider,
  requestedStatus,
  existingTransaction,
}: {
  provider: "QRIS" | "Cash" | "Voucher";
  requestedStatus?: TransactionStatus;
  existingTransaction: ExistingTransaction | null;
}): TransactionStatus {
  const existingIsPaid = isDuitkuTransactionPaid(existingTransaction);

  if (existingIsPaid) {
    return "paid";
  }

  if (provider === "QRIS") {
    if (requestedStatus && requestedStatus !== "paid") {
      return requestedStatus;
    }
    return "pending";
  }

  return requestedStatus ?? "paid";
}

async function restoreConfirmedQrisPaidStatus(
  client: Awaited<ReturnType<typeof requireKioskContext>>["client"],
  organizationId: string,
  transactionId: string,
) {
  const { data, error: readError } = await client
    .from("transactions")
    .select("status,paid_at,duitku_status_code,gateway_response")
    .eq("organization_id", organizationId)
    .eq("id", transactionId)
    .eq("provider", "QRIS")
    .maybeSingle();

  if (readError) throw readError;
  if (!isDuitkuTransactionPaid((data ?? null) as ExistingTransaction | null)) {
    return;
  }

  const { error } = await client
    .from("transactions")
    .update({
      status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", transactionId)
    .eq("provider", "QRIS")
    .neq("status", "paid");

  if (error) throw error;
}

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") ?? "";
    const device = await requireOrganizationDevice(context, deviceId);

    // Fetch transactions for this booth
    const { data: transactions, error } = await context.client
      .from("transactions")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("booth", device.name)
      .order("created_at_label", { ascending: false });

    if (error) throw error;

    const normalizedTransactions =
      transactions?.map((transaction) =>
        normalizeQrisTransactionStatus(transaction),
      ) ?? [];

    // Calculate total money (paid transactions)
    const totalAmount =
      normalizedTransactions
        .filter((t) => t.status === "paid")
        .reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? 0;

    return jsonOk({
      totalAmount,
      transactions: normalizedTransactions,
    });
  } catch (error) {
    return jsonError(error);
  }
}
