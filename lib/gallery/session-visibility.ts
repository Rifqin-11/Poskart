export type GallerySessionVisibilityInput = {
  id: string;
  created_at: string;
};

export type LivePhotoJobVisibilityInput = {
  session_id: string;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const ACTIVE_LIVE_PHOTO_STATUSES = new Set(["queued", "processing"]);
export const LIVE_PHOTO_PENDING_VISIBILITY_WINDOW_MS = 10 * 60_000;

export function isActiveLivePhotoJob(
  job: LivePhotoJobVisibilityInput | null | undefined,
) {
  return Boolean(job?.status && ACTIVE_LIVE_PHOTO_STATUSES.has(job.status));
}

export function isRecentActiveLivePhotoJob(
  session: GallerySessionVisibilityInput,
  job: LivePhotoJobVisibilityInput | null | undefined,
  now = Date.now(),
) {
  if (!isActiveLivePhotoJob(job)) return false;

  const timestamp = Date.parse(
    job?.updated_at ?? job?.created_at ?? session.created_at,
  );

  if (!Number.isFinite(timestamp)) return false;
  return timestamp >= now - LIVE_PHOTO_PENDING_VISIBILITY_WINDOW_MS;
}

export function shouldShowGallerySession({
  session,
  photoCount,
  livePhotoJob,
  now,
}: {
  session: GallerySessionVisibilityInput;
  photoCount: number;
  livePhotoJob?: LivePhotoJobVisibilityInput | null;
  now?: number;
}) {
  return (
    photoCount > 0 ||
    isRecentActiveLivePhotoJob(session, livePhotoJob, now ?? Date.now())
  );
}
