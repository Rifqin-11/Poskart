import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type PosSaleBody = {
  deviceId?: string;
  customerName?: string;
  packageCode?: string;
  packageName?: string;
  printCount?: number;
  amount?: number;
  paymentMethod?: "Cash" | "QRIS";
  notes?: string | null;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as PosSaleBody;
    await requireOrganizationDevice(context, body.deviceId ?? "");

    if (
      !body.packageCode ||
      !body.packageName ||
      !Number.isFinite(body.amount)
    ) {
      return jsonOk(
        {
          error: "Package code, package name, and amount are required.",
          code: "KIOSK_POS_SALE_INVALID",
        },
        { status: 400 },
      );
    }

    const { data, error } = await context.client
      .from("pos_sales")
      .insert({
        organization_id: context.organizationId,
        customer_name: body.customerName?.trim() || "Walk-in",
        package_code: body.packageCode,
        package_name: body.packageName,
        print_count: Math.max(1, Math.round(body.printCount ?? 1)),
        amount: Math.max(0, Math.round(body.amount!)),
        payment_method: body.paymentMethod ?? "QRIS",
        notes: body.notes ?? null,
        created_by: context.user.id,
      })
      .select("id")
      .single();

    if (error) throw error;
    return jsonOk({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
