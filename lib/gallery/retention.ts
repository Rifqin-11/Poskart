import "server-only";

import { deleteCloudinaryAssets } from "@/lib/cloudinary/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CONFIG_ID = "default";
const DEFAULT_LINK_EXPIRY_HOURS = 168;
const DEFAULT_CLOUDINARY_RETENTION_DAYS = 14;
const MAX_CLEANUP_SESSIONS = 100;

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
    return {
      cutoff,
      retentionDays: cloudinaryRetentionDays,
      sessionCount: 0,
      assetCount: 0,
      deletedSessionIds: [],
    };
  }

  const { data: photos, error: photosError } = await supabase
    .from("gallery_photos")
    .select("cloudinary_public_id")
    .in("session_id", sessionIds);

  if (photosError) {
    throw new Error(`Unable to load expired gallery photos: ${photosError.message}`);
  }

  const publicIds = Array.from(
    new Set(
      (photos ?? [])
        .map((photo) => photo.cloudinary_public_id)
        .filter((publicId): publicId is string => Boolean(publicId)),
    ),
  );

  if (publicIds.length > 0) {
    await deleteCloudinaryAssets(publicIds);
  }

  const { error: deleteError } = await supabase
    .from("gallery_sessions")
    .delete()
    .in("id", sessionIds);

  if (deleteError) {
    throw new Error(`Unable to delete expired gallery sessions: ${deleteError.message}`);
  }

  return {
    cutoff,
    retentionDays: cloudinaryRetentionDays,
    sessionCount: sessionIds.length,
    assetCount: publicIds.length,
    deletedSessionIds: sessionIds,
  };
}
