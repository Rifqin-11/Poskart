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
