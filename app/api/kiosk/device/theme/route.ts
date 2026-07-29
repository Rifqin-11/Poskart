import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type ThemeBody = {
  deviceId?: string;
  /** Stable layout identity. New kiosk clients should send this value. */
  layoutSchemaId?: string;
  /** Legacy display name accepted while older kiosks migrate. */
  theme?: string;
};

/**
 * PATCH /api/kiosk/device/theme
 * Called by the Flutter kiosk app when the operator selects a Builder Theme.
 * The selection is device-scoped; it must never change another booth's layout.
 */
export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as ThemeBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );

    const requestedLayoutId = (body.layoutSchemaId ?? "").trim();
    const requestedThemeName = (body.theme ?? "").trim();
    if (!requestedLayoutId && !requestedThemeName) {
      return jsonError(new Error("layoutSchemaId or theme field is required"));
    }

    const now = new Date().toISOString();
    const { data: layouts, error: layoutError } = await context.client
      .from("layout_schemas")
      .select("id,name")
      .eq("organization_id", context.organizationId);
    if (layoutError) throw layoutError;

    const matchedById = (layouts ?? []).find(
      (layout) => layout.id === requestedLayoutId,
    );
    const matchedByName = requestedLayoutId
      ? []
      : (layouts ?? []).filter((layout) => layout.name === requestedThemeName);
    const matchedLayout = matchedById ?? matchedByName[0] ?? null;
    if (!matchedLayout || matchedByName.length > 1) {
      return jsonError(new Error("The selected device layout is unavailable."));
    }

    const { error: deviceError } = await context.client
      .from("devices")
      .update({
        layout_schema_id: matchedLayout.id,
        theme: matchedLayout.name,
        updated_at: now,
      })
      .eq("id", device.id)
      .eq("organization_id", context.organizationId);

    if (deviceError) throw deviceError;

    return jsonOk({
      success: true,
      theme: matchedLayout.name,
      layoutSchemaId: matchedLayout.id,
    });
  } catch (error) {
    return jsonError(error);
  }
}
