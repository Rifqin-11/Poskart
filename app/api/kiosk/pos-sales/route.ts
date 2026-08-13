import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { resolveKioskPricingQuote } from "@/lib/kiosk/pricing";

type PosSaleBody = {
  deviceId?: string;
  customerName?: string;
  packageCode?: string;
  packageName?: string;
  printCount?: number;
  amount?: number;
  templateId?: string;
  paymentMethod?: "Cash" | "QRIS";
  notes?: string | null;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as PosSaleBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );

    if (!body.packageCode) {
      return jsonOk(
        {
          error: "Package code is required.",
          code: "KIOSK_POS_SALE_INVALID",
        },
        { status: 400 },
      );
    }

    const product = await resolveKioskPricingQuote(
      context,
      device,
      body.packageCode,
      body.templateId,
    );
    if (product.accessMode === "event") {
      return jsonOk(
        {
          error: "Event access cannot be recorded as a POS sale.",
          code: "KIOSK_EVENT_POS_SALE_NOT_ALLOWED",
        },
        { status: 400 },
      );
    }

    const { data, error } = await context.client
      .from("pos_sales")
      .insert({
        organization_id: context.organizationId,
        customer_name: body.customerName?.trim() || "Walk-in",
        package_code: product.id,
        package_name: product.name,
        print_count: product.printCount,
        amount: product.amount,
        template_id: product.templateId,
        pricing_mode: product.pricingMode,
        pricing_unit_amount: product.unitAmount,
        photo_slot_count: product.photoSlotCount,
        pricing_snapshot: product.pricingSnapshot,
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
