import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type TransactionBody = {
  deviceId?: string;
  transaction?: {
    id?: string;
    customer?: string;
    packageName?: string;
    amount?: number;
    status?: "paid" | "pending" | "failed" | "refunded";
    provider?: "QRIS" | "Cash";
    printStatus?: "pending" | "printed" | "failed" | "reprinting";
    printAttempts?: number;
    printLastError?: string | null;
  };
  posSale?: {
    packageCode?: string;
    packageName?: string;
    printCount?: number;
    amount?: number;
    paymentMethod?: "Cash" | "QRIS";
    notes?: string | null;
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
      !transaction.packageName ||
      !Number.isFinite(transaction.amount)
    ) {
      return jsonOk(
        {
          error: "Transaction ID, package name, and amount are required.",
          code: "KIOSK_TRANSACTION_INVALID",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { error: transactionError } = await context.client
      .from("transactions")
      .upsert({
        id: transaction.id,
        organization_id: context.organizationId,
        booth: device.name,
        location: device.location,
        customer: transaction.customer?.trim() || "Walk-in",
        package_name: transaction.packageName,
        amount: Math.max(0, Math.round(transaction.amount!)),
        status: transaction.status ?? "paid",
        provider: transaction.provider ?? "QRIS",
        created_at_label: now,
        print_status: transaction.printStatus ?? "pending",
        print_attempts: Math.max(0, transaction.printAttempts ?? 0),
        print_last_error: transaction.printLastError ?? null,
        updated_at: now,
      });

    if (transactionError) throw transactionError;

    if (body.posSale?.packageCode && body.posSale.packageName) {
      const { error: posError } = await context.client.from("pos_sales").insert({
        organization_id: context.organizationId,
        customer_name: transaction.customer?.trim() || "Walk-in",
        package_code: body.posSale.packageCode,
        package_name: body.posSale.packageName,
        print_count: Math.max(1, Math.round(body.posSale.printCount ?? 1)),
        amount: Math.max(0, Math.round(body.posSale.amount ?? transaction.amount!)),
        payment_method: body.posSale.paymentMethod ?? "QRIS",
        notes: body.posSale.notes ?? transaction.id,
        created_by: context.user.id,
      });

      if (posError) throw posError;
    }

    return jsonOk({ success: true, transactionId: transaction.id });
  } catch (error) {
    return jsonError(error);
  }
}
