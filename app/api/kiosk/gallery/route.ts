import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { deleteGalleryAssets } from "@/lib/gallery/storage-provider";
import {
  isDisplayableGalleryPhoto,
  shouldShowGallerySession,
} from "@/lib/gallery/session-visibility";

function encodeGalleryCursor(createdAt: string, id: string) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url");
}

function decodeGalleryCursor(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed.createdAt === "string" && typeof parsed.id === "string") {
      return parsed as { createdAt: string; id: string };
    }
  } catch {}
  return null;
}

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") ?? "";
    const sessionId = searchParams.get("sessionId")?.trim() ?? "";
    const summaryOnly =
      searchParams.get("summaryOnly") !== "false" && !sessionId;
    const cursor = searchParams.get("cursor")?.trim() ?? "";
    const requestedLimit = Number(searchParams.get("limit") ?? 24);
    const limit = Math.min(
      50,
      Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 24),
    );
    await requireOrganizationDevice(context, deviceId);

    let sessionsQuery = context.client
      .from("gallery_sessions")
      .select(
        "id,device_id,template_name,theme_name,social_media_consent,test_mode,share_url,created_at",
      )
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false });
    if (sessionId) {
      sessionsQuery = sessionsQuery.eq("id", sessionId).limit(1);
    } else {
      if (cursor) {
        const decodedCursor = decodeGalleryCursor(cursor);
        if (decodedCursor) {
          sessionsQuery = sessionsQuery.or(
            `created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`,
          );
        } else {
          sessionsQuery = sessionsQuery.lt("created_at", cursor);
        }
      }
      sessionsQuery = sessionsQuery.limit(limit + 1);
    }
    const { data: sessionRows, error: sessionsError } = await sessionsQuery;

    if (sessionsError) throw sessionsError;
    const hasMore = !sessionId && (sessionRows ?? []).length > limit;
    const sessions = sessionId
      ? (sessionRows ?? [])
      : (sessionRows ?? []).slice(0, limit);
    const lastSession = sessions[sessions.length - 1];
    const nextCursor =
      hasMore && lastSession
        ? encodeGalleryCursor(lastSession.created_at, lastSession.id)
        : null;

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
      if (!isDisplayableGalleryPhoto(photo)) {
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

    const responsePhotos = summaryOnly
      ? visibleSessions.flatMap((session) => {
          const sessionPhotos = (photos ?? []).filter(
            (photo) => photo.session_id === session.id,
          );
          const thumbnail =
            sessionPhotos.find((photo) => photo.kind === "framed") ??
            sessionPhotos.find(
              (photo) =>
                photo.kind === "raw" &&
                photo.photo_index !== 98 &&
                photo.photo_index !== 99,
            );
          return thumbnail ? [thumbnail] : [];
        })
      : (photos ?? []).filter((photo) =>
          visibleSessionIds.has(photo.session_id),
        );

    return jsonOk({
      sessions: visibleSessions,
      photos: responsePhotos,
      nextCursor,
      hasMore,
      summaryOnly,
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

    // Fetch photo storage IDs
    const { data: photos } = await context.client
      .from("gallery_photos")
      .select("storage_provider,provider_public_id,cloudinary_public_id")
      .eq("session_id", sessionId);

    if ((photos ?? []).length > 0) {
      await deleteGalleryAssets(photos ?? []);
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
