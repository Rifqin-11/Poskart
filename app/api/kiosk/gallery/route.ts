import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { deleteCloudinaryAssets } from "@/lib/cloudinary/server";
import {
  isDisplayableGalleryPhoto,
  shouldShowGallerySession,
} from "@/lib/gallery/session-visibility";

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") ?? "";
    await requireOrganizationDevice(context, deviceId);

    // Fetch sessions for this organization
    const { data: sessions, error: sessionsError } = await context.client
      .from("gallery_sessions")
      .select(
        "id,device_id,template_name,theme_name,social_media_consent,share_url,created_at",
      )
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

    const { data: livePhotoJobs, error: livePhotoJobsError } = sessionIds.length
      ? await context.client
          .from("live_photo_render_jobs")
          .select("session_id,status,updated_at")
          .in("session_id", sessionIds)
      : { data: [], error: null };

    if (livePhotoJobsError) throw livePhotoJobsError;

    const { data: transactions, error: transactionsError } = sessionIds.length
      ? await context.client
          .from("transactions")
          .select("id,package_name,print_count")
          .eq("organization_id", context.organizationId)
          .in("id", sessionIds)
      : { data: [], error: null };

    if (transactionsError) throw transactionsError;

    const livePhotoJobBySessionId = new Map(
      (livePhotoJobs ?? []).map((job) => [job.session_id, job]),
    );
    const transactionBySessionId = new Map(
      (transactions ?? []).map((transaction) => [transaction.id, transaction]),
    );
    const photoCountBySessionId = new Map<string, number>();
    for (const photo of photos ?? []) {
      if (
        !isDisplayableGalleryPhoto(photo, {
          hasValidTransaction: transactionBySessionId.has(photo.session_id),
        })
      ) {
        continue;
      }
      photoCountBySessionId.set(
        photo.session_id,
        (photoCountBySessionId.get(photo.session_id) ?? 0) + 1,
      );
    }
    const enrichedSessions = (sessions ?? []).map((session) => {
      const transaction = transactionBySessionId.get(session.id);
      return {
        ...session,
        package_name: transaction?.package_name ?? null,
        print_count: transaction?.print_count ?? 0,
      };
    });
    const now = Date.now();
    const visibleSessions = enrichedSessions.filter((session) =>
      shouldShowGallerySession({
        session,
        photoCount: photoCountBySessionId.get(session.id) ?? 0,
        livePhotoJob: livePhotoJobBySessionId.get(session.id),
        now,
      }),
    );
    const visibleSessionIds = new Set(
      visibleSessions.map((session) => session.id),
    );

    return jsonOk({
      sessions: visibleSessions,
      photos: (photos ?? []).filter((photo) =>
        visibleSessionIds.has(photo.session_id),
      ),
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
