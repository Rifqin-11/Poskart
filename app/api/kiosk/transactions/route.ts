import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { resolveKioskPricingProduct } from "@/lib/kiosk/pricing";

type TransactionBody = {
  deviceId?: string;
  transaction?: {
    id?: string;
    customer?: string;
    packageCode?: string;
    packageName?: string;
    amount?: number;
    status?: "paid" | "pending" | "failed" | "refunded";
    provider?: "QRIS" | "Cash" | "Voucher";
    templateId?: string;
    printCount?: number;
    printStatus?: "pending" | "printed" | "failed" | "reprinting";
    printAttempts?: number;
    printLastError?: string | null;
  };
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

    const now = new Date().toISOString();
    const provider =
      transaction.provider === "Cash"
        ? "Cash"
        : transaction.provider === "Voucher"
          ? "Voucher"
          : "QRIS";
    const status = provider === "QRIS" ? "pending" : "paid";
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
        template_id: templateId,
        print_count: product.printCount,
        created_at_label: now,
        print_status: transaction.printStatus ?? "pending",
        print_attempts: Math.max(0, transaction.printAttempts ?? 0),
        print_last_error: transaction.printLastError ?? null,
        updated_at: now,
      });

    if (transactionError) throw transactionError;

    return jsonOk({ success: true, transactionId: transaction.id });
  } catch (error) {
    return jsonError(error);
  }
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

    // Calculate total money (paid transactions)
    const totalAmount =
      transactions
        ?.filter((t) => t.status === "paid")
        .reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? 0;

    return jsonOk({
      totalAmount,
      transactions: transactions ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
