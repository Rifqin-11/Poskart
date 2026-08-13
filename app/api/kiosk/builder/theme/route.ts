import { sanitizeLayoutSchema } from "@/lib/builder/schema";
import {
  formatMissingRequiredBuilderElements,
  getMissingRequiredBuilderElements,
} from "@/lib/builder/required-elements";
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
    const missingElements = getMissingRequiredBuilderElements(body.schema);
    if (missingElements.length > 0) {
      return jsonOk(
        {
          error: `Pastikan elemen wajib berikut tersedia dan terlihat sebelum menyimpan. ${formatMissingRequiredBuilderElements(missingElements)}`,
          code: "BUILDER_REQUIRED_ELEMENTS_MISSING",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const id = body.id?.trim() || `LYT-${Date.now()}`;
    const isActive = body.isActive === true;
    const { data: existingLayout, error: existingLayoutError } =
      await context.client
        .from("layout_schemas")
        .select("id,is_active")
        .eq("id", id)
        .eq("organization_id", context.organizationId)
        .maybeSingle();
    if (existingLayoutError) throw existingLayoutError;

    const { error } = await context.client.from("layout_schemas").upsert({
      id,
      organization_id: context.organizationId,
      name,
      status: isActive ? "published" : (body.status ?? "draft"),
      schema: sanitizeLayoutSchema(body.schema),
      // Kiosk-created layouts can be selected by one device without changing
      // the organization-wide fallback layout.
      is_active: existingLayout?.is_active ?? false,
      updated_at: now,
    });
    if (error) throw error;

    if (isActive) {
      await context.client
        .from("devices")
        .update({
          layout_schema_id: id,
          theme: name,
          updated_at: now,
        })
        .eq("id", device.id)
        .eq("organization_id", context.organizationId);
    }

    return jsonOk({ id, name, isActive });
  } catch (error) {
    return jsonError(error);
  }
}
