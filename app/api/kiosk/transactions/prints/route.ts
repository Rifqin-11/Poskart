import {
  KioskApiError,
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type AdditionalPrintBody = {
  deviceId?: string;
  transactionId?: string;
  eventId?: string;
  copies?: number;
  source?: "kiosk_print" | "kiosk_reprint";
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as AdditionalPrintBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const transactionId = body.transactionId?.trim() ?? "";
    const eventId = body.eventId?.trim() ?? "";
    const copies = Math.trunc(body.copies ?? 0);
    const source = body.source === "kiosk_print" ? "kiosk_print" : "kiosk_reprint";

    if (!transactionId || !eventId || copies < 1 || copies > 20) {
      throw new KioskApiError(
        "Transaction, print event, and copy count are required.",
        400,
        "KIOSK_PRINT_EVENT_INVALID",
      );
    }

    const { data, error } = await context.client.rpc(
      "record_transaction_additional_print",
      {
        p_event_id: eventId,
        p_organization_id: context.organizationId,
        p_transaction_id: transactionId,
        p_device_id: device.id,
        p_copies: copies,
        p_source: source,
      },
    );
    if (error) throw error;

    return jsonOk({ success: true, counted: data === true });
  } catch (error) {
    return jsonError(error);
  }
}
