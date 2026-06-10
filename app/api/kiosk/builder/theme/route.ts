import { sanitizeLayoutSchema } from "@/lib/builder/schema";
import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import type { LayoutSchema } from "@/types/builder";

type SaveThemeBody = {
  deviceId?: string;
  id?: string;
  name?: string;
  status?: string;
  isActive?: boolean;
  schema?: LayoutSchema;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as SaveThemeBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );

    const name = body.name?.trim() || "POSKART Custom";
    if (!body.schema) {
      return jsonOk(
        { error: "schema field is required", code: "BUILDER_SCHEMA_REQUIRED" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const id = body.id?.trim() || `LYT-${Date.now()}`;
    const isActive = body.isActive === true;

    if (isActive) {
      await context.client
        .from("layout_schemas")
        .update({ is_active: false, updated_at: now })
        .eq("organization_id", context.organizationId);
    }

    const { error } = await context.client.from("layout_schemas").upsert({
      id,
      organization_id: context.organizationId,
      name,
      status: isActive ? "published" : body.status ?? "draft",
      schema: sanitizeLayoutSchema(body.schema),
      is_active: isActive,
      updated_at: now,
    });
    if (error) throw error;

    if (isActive) {
      await context.client
        .from("devices")
        .update({ theme: name, updated_at: now })
        .eq("id", device.id)
        .eq("organization_id", context.organizationId);
    }

    return jsonOk({ id, name, isActive });
  } catch (error) {
    return jsonError(error);
  }
}
