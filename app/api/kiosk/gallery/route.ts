import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { deleteCloudinaryAssets } from "@/lib/cloudinary/server";

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

    const { data: transactions, error: transactionsError } = sessionIds.length
      ? await context.client
          .from("transactions")
          .select("id,package_name,print_count")
          .eq("organization_id", context.organizationId)
          .in("id", sessionIds)
      : { data: [], error: null };

    if (transactionsError) throw transactionsError;

    const transactionBySessionId = new Map(
      (transactions ?? []).map((transaction) => [transaction.id, transaction]),
    );
    const enrichedSessions = (sessions ?? []).map((session) => {
      const transaction = transactionBySessionId.get(session.id);
      return {
        ...session,
        package_name: transaction?.package_name ?? null,
        print_count: transaction?.print_count ?? 0,
      };
    });

    return jsonOk({
      sessions: enrichedSessions,
      photos: photos ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? "";
    const deviceId = searchParams.get("deviceId") ?? "";
    await requireOrganizationDevice(context, deviceId);

    if (!sessionId) {
      return jsonOk({ error: "Session ID is required" }, { status: 400 });
    }

    // Verify ownership
    const { data: session, error: verifyError } = await context.client
      .from("gallery_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (verifyError || !session) {
      return jsonOk(
        { error: "Session not found or access denied" },
        { status: 404 },
      );
    }

    // Fetch photo cloudinary public IDs
    const { data: photos } = await context.client
      .from("gallery_photos")
      .select("cloudinary_public_id")
      .eq("session_id", sessionId);

    const publicIds = (photos ?? [])
      .map((p) => p.cloudinary_public_id)
      .filter(Boolean);

    // Delete from Cloudinary
    if (publicIds.length > 0) {
      await deleteCloudinaryAssets(publicIds);
    }

    // Delete session (cascades to gallery_photos)
    const { error: deleteError } = await context.client
      .from("gallery_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("organization_id", context.organizationId);

    if (deleteError) throw deleteError;

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
