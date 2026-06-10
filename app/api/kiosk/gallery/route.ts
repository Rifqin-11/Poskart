import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") ?? "";
    await requireOrganizationDevice(context, deviceId);

    // Fetch sessions for this organization
    const { data: sessions, error: sessionsError } = await context.client
      .from("gallery_sessions")
      .select("id,device_id,template_name,share_url,created_at")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (sessionsError) throw sessionsError;

    const sessionIds = (sessions ?? []).map((s) => s.id);
    const { data: photos, error: photosError } = sessionIds.length
      ? await context.client
          .from("gallery_photos")
          .select("id,session_id,kind,photo_index,secure_url")
          .in("session_id", sessionIds)
          .order("photo_index", { ascending: true })
      : { data: [], error: null };

    if (photosError) throw photosError;

    return jsonOk({
      sessions: sessions ?? [],
      photos: photos ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
