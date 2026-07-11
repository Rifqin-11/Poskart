import "server-only";

import { deleteGalleryAssets } from "@/lib/gallery/storage-provider";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CONFIG_ID = "default";
const DEFAULT_LINK_EXPIRY_HOURS = 168;
const DEFAULT_CLOUDINARY_RETENTION_DAYS = 14;
const DEFAULT_ORPHAN_SESSION_RETENTION_HOURS = 6;
const MAX_CLEANUP_SESSIONS = 100;
const MAX_ORPHAN_CLEANUP_SESSIONS = 100;

type GalleryRetentionConfig = {
  linkExpiryHours: number;
  cloudinaryRetentionDays: number;
};

type CleanupResult = {
  cutoff: string;
  retentionDays: number;
  sessionCount: number;
  assetCount: number;
  deletedSessionIds: string[];
  orphanCutoff: string;
  orphanSessionCount: number;
  deletedOrphanSessionIds: string[];
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export async function getGalleryRetentionConfig(): Promise<GalleryRetentionConfig> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("app_configs")
    .select("download_expiry_hours,gallery_retention_days")
    .eq("id", CONFIG_ID)
    .maybeSingle();

  return {
    linkExpiryHours: clampInteger(
      data?.download_expiry_hours,
      DEFAULT_LINK_EXPIRY_HOURS,
      1,
      720,
    ),
    cloudinaryRetentionDays: clampInteger(
      data?.gallery_retention_days,
      DEFAULT_CLOUDINARY_RETENTION_DAYS,
      1,
      365,
    ),
  };
}

export function getGalleryLinkExpiryDate(
  createdAt: string,
  linkExpiryHours: number,
) {
  return new Date(new Date(createdAt).getTime() + linkExpiryHours * 60 * 60_000);
}

export function isGalleryLinkExpired(createdAt: string, linkExpiryHours: number) {
  return getGalleryLinkExpiryDate(createdAt, linkExpiryHours).getTime() <= Date.now();
}

export async function cleanupExpiredGalleryAssets(): Promise<CleanupResult> {
  const supabase = createSupabaseAdminClient();
  const { cloudinaryRetentionDays } = await getGalleryRetentionConfig();
  const cutoffDate = new Date(
    Date.now() - cloudinaryRetentionDays * 24 * 60 * 60_000,
  );
  const cutoff = cutoffDate.toISOString();

  const { data: sessions, error: sessionsError } = await supabase
    .from("gallery_sessions")
    .select("id")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(MAX_CLEANUP_SESSIONS);

  if (sessionsError) {
    throw new Error(`Unable to load expired gallery sessions: ${sessionsError.message}`);
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);
  if (sessionIds.length === 0) {
    const orphanCleanup = await cleanupOrphanGallerySessions(supabase);

    return {
      cutoff,
      retentionDays: cloudinaryRetentionDays,
      sessionCount: 0,
      assetCount: 0,
      deletedSessionIds: [],
      ...orphanCleanup,
    };
  }

  const { data: photos, error: photosError } = await supabase
    .from("gallery_photos")
    .select("storage_provider,provider_public_id,cloudinary_public_id")
    .in("session_id", sessionIds);

  if (photosError) {
    throw new Error(`Unable to load expired gallery photos: ${photosError.message}`);
  }

  if ((photos ?? []).length > 0) {
    await deleteGalleryAssets(photos ?? []);
  }

  const { error: deleteError } = await supabase
    .from("gallery_sessions")
    .delete()
    .in("id", sessionIds);

  if (deleteError) {
    throw new Error(`Unable to delete expired gallery sessions: ${deleteError.message}`);
  }

  const orphanCleanup = await cleanupOrphanGallerySessions(supabase);

  return {
    cutoff,
    retentionDays: cloudinaryRetentionDays,
    sessionCount: sessionIds.length,
    assetCount: (photos ?? []).length,
    deletedSessionIds: sessionIds,
    ...orphanCleanup,
  };
}

async function cleanupOrphanGallerySessions(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
) {
  const orphanCutoff = new Date(
    Date.now() - DEFAULT_ORPHAN_SESSION_RETENTION_HOURS * 60 * 60_000,
  ).toISOString();

  const { data: candidates, error: candidatesError } = await supabase
    .from("gallery_sessions")
    .select("id")
    .lt("created_at", orphanCutoff)
    .order("created_at", { ascending: true })
    .limit(MAX_ORPHAN_CLEANUP_SESSIONS);

  if (candidatesError) {
    throw new Error(
      `Unable to load orphan gallery sessions: ${candidatesError.message}`,
    );
  }

  const candidateIds = (candidates ?? []).map((session) => session.id);
  if (candidateIds.length === 0) {
    return {
      orphanCutoff,
      orphanSessionCount: 0,
      deletedOrphanSessionIds: [],
    };
  }

  const [{ data: photos, error: photosError }, { data: activeJobs, error: jobsError }] =
    await Promise.all([
      supabase
        .from("gallery_photos")
        .select("session_id")
        .in("session_id", candidateIds),
      supabase
        .from("live_photo_render_jobs")
        .select("session_id")
        .in("session_id", candidateIds)
        .in("status", ["queued", "processing"]),
    ]);

  if (photosError) {
    throw new Error(`Unable to load orphan gallery photos: ${photosError.message}`);
  }

  if (jobsError) {
    throw new Error(`Unable to load live photo jobs: ${jobsError.message}`);
  }

  const sessionIdsWithPhotos = new Set(
    (photos ?? []).map((photo) => photo.session_id),
  );
  const sessionIdsWithActiveJobs = new Set(
    (activeJobs ?? []).map((job) => job.session_id),
  );
  const orphanSessionIds = candidateIds.filter(
    (sessionId) =>
      !sessionIdsWithPhotos.has(sessionId) &&
      !sessionIdsWithActiveJobs.has(sessionId),
  );

  if (orphanSessionIds.length === 0) {
    return {
      orphanCutoff,
      orphanSessionCount: 0,
      deletedOrphanSessionIds: [],
    };
  }

  const { error: deleteError } = await supabase
    .from("gallery_sessions")
    .delete()
    .in("id", orphanSessionIds);

  if (deleteError) {
    throw new Error(`Unable to delete orphan gallery sessions: ${deleteError.message}`);
  }

  return {
    orphanCutoff,
    orphanSessionCount: orphanSessionIds.length,
    deletedOrphanSessionIds: orphanSessionIds,
  };
}
