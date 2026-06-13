import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type StatusBody = {
  deviceId?: string;
  status?: "online" | "offline" | "maintenance";
  battery?: number;
  appVersion?: string;
  location?: string;
  printerStatus?: string;
  printerName?: string | null;
  printerLastError?: string | null;
  printerBidirectional?: boolean;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as StatusBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const status = body.status ?? "online";
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status,
      app_version: body.appVersion?.trim() || device.app_version,
      last_sync: now,
      updated_at: now,
    };

    if (Number.isFinite(body.battery)) {
      patch.battery = Math.max(0, Math.min(100, Math.round(body.battery!)));
    }

    if (body.location !== undefined) {
      patch.location = body.location;
    }

    const printerStatuses = new Set([
      "ready",
      "disconnected",
      "permission_required",
      "paper_out",
      "error",
      "unknown",
    ]);
    if (body.printerStatus && printerStatuses.has(body.printerStatus)) {
      patch.printer_status = body.printerStatus;
      patch.printer_name = body.printerName?.trim() || null;
      patch.printer_last_error = body.printerLastError?.trim() || null;
      patch.printer_bidirectional = body.printerBidirectional === true;
      patch.printer_status_updated_at = now;
    }

    const { error } = await context.client
      .from("devices")
      .update(patch)
      .eq("id", device.id)
      .eq("organization_id", context.organizationId);

    if (error) throw error;
    return jsonOk({ success: true, lastSync: now });
  } catch (error) {
    return jsonError(error);
  }
}
