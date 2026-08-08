import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type PaperRollBody = {
  deviceId?: string;
  rollType?: string;
  initialLengthMm?: number;
  usedLengthMm?: number;
  installedAt?: string;
  updatedAt?: string;
};

const validRollTypes = new Set(["80x40", "80x80", "custom"]);

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as PaperRollBody;
    const device = await requireOrganizationDevice(context, body.deviceId ?? "");
    const initialLengthMm = Number(body.initialLengthMm);
    const usedLengthMm = Number(body.usedLengthMm);
    const clientUpdatedAt = Date.parse(body.updatedAt ?? "");
    const installedAt = Date.parse(body.installedAt ?? "");

    if (!validRollTypes.has(body.rollType ?? "")) {
      throw new Error("Unsupported paper roll type.");
    }
    if (!Number.isFinite(initialLengthMm) || initialLengthMm < 1000 || initialLengthMm > 500000) {
      throw new Error("Paper roll length must be between 1 and 500 meters.");
    }
    if (!Number.isFinite(usedLengthMm) || usedLengthMm < 0 || usedLengthMm > initialLengthMm) {
      throw new Error("Paper usage is outside the installed roll length.");
    }
    if (!Number.isFinite(clientUpdatedAt) || !Number.isFinite(installedAt)) {
      throw new Error("Paper roll timestamps are invalid.");
    }

    const serverUpdatedAt = Date.parse(device.paper_updated_at ?? "");
    if (Number.isFinite(serverUpdatedAt) && serverUpdatedAt > clientUpdatedAt) {
      return jsonOk({ success: true, ignored: "stale" });
    }

    const updatedAt = new Date().toISOString();
    const { error } = await context.client
      .from("devices")
      .update({
        paper_roll_type: body.rollType,
        paper_initial_length_mm: initialLengthMm,
        paper_used_length_mm: usedLengthMm,
        paper_installed_at: new Date(installedAt).toISOString(),
        paper_updated_at: updatedAt,
        updated_at: updatedAt,
      })
      .eq("id", device.id)
      .eq("organization_id", context.organizationId);
    if (error) throw error;
    return jsonOk({ success: true, updatedAt });
  } catch (error) {
    return jsonError(error);
  }
}
