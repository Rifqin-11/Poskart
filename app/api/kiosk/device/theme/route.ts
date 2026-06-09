import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type ThemeBody = {
  deviceId?: string;
  /** The name of the builder layout/theme to activate (matches layout_schemas.name) */
  theme?: string;
};

/**
 * PATCH /api/kiosk/device/theme
 * Called by the Flutter kiosk app when the operator selects a new active Builder Theme.
 * Updates devices.theme and activates the matching layout_schema row for the org.
 */
export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as ThemeBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );

    const themeName = (body.theme ?? "").trim();
    if (!themeName) {
      return jsonError(
        new Error("theme field is required"),
      );
    }

    const now = new Date().toISOString();

    // 1. Update the device row with the new active theme name
    const { error: deviceError } = await context.client
      .from("devices")
      .update({ theme: themeName, updated_at: now })
      .eq("id", device.id)
      .eq("organization_id", context.organizationId);

    if (deviceError) throw deviceError;

    // 2. Activate the matching layout_schema for this org (set is_active = true on it,
    //    false on all others). This keeps the web dashboard in sync.
    const { data: matchedLayouts } = await context.client
      .from("layout_schemas")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("name", themeName)
      .limit(1);

    const matchedId = matchedLayouts?.[0]?.id;

    if (matchedId) {
      // Deactivate all layouts for this org first
      await context.client
        .from("layout_schemas")
        .update({ is_active: false, updated_at: now })
        .eq("organization_id", context.organizationId);

      // Activate the matched one
      await context.client
        .from("layout_schemas")
        .update({ is_active: true, updated_at: now })
        .eq("id", matchedId)
        .eq("organization_id", context.organizationId);
    }

    return jsonOk({ success: true, theme: themeName, activatedLayoutId: matchedId ?? null });
  } catch (error) {
    return jsonError(error);
  }
}
