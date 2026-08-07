import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { getPublicGalleryUrl } from "@/lib/gallery/urls";
import { normalizeProvider, type GalleryStorageProvider } from "@/lib/gallery/storage-provider";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LivePhotoSourceAsset = {
  slotIndex?: number;
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  storageProvider?: GalleryStorageProvider;
  mirrorHorizontal?: boolean;
};

type LivePhotoJobBody = {
  deviceId?: string;
  sessionId?: string;
  templateName?: string;
  themeName?: string;
  socialMediaConsent?: boolean;
  testMode?: boolean;
  sourceGeneration?: number;
  template?: Record<string, unknown>;
  assets?: LivePhotoSourceAsset[];
};

const MAX_LIVE_PHOTO_SOURCE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as LivePhotoJobBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
      { allowPaidSessionId: body.sessionId },
    );
    const sessionId = body.sessionId?.trim() ?? "";
    const template = body.template ?? {};
    const assets = (body.assets ?? []).filter(
      (asset) =>
        Number.isInteger(asset.slotIndex) &&
        (asset.slotIndex ?? -1) >= 0 &&
        Boolean(asset.publicId?.trim()) &&
        isAllowedSourceAsset(asset),
    );

    if (!sessionId || assets.length === 0) {
      return jsonOk(
        {
          error: "A session ID and uploaded Live Photo sources are required.",
          code: "KIOSK_LIVE_PHOTO_JOB_INVALID",
        },
        { status: 400 },
      );
    }

    const shareUrl = getPublicGalleryUrl(sessionId);
    const requestedGeneration = Number(body.sourceGeneration ?? 0);
    const sourceGeneration =
      Number.isSafeInteger(requestedGeneration) && requestedGeneration >= 0
        ? requestedGeneration
        : 0;

    const { data, error: jobError } = await createSupabaseAdminClient().rpc(
      "enqueue_live_photo_render_job",
      {
        p_session_id: sessionId,
        p_organization_id: context.organizationId,
        p_device_id: device.id,
        p_template_name: body.templateName?.trim() ?? "",
        p_theme_name: body.themeName?.trim() ?? "",
        p_social_media_consent: body.socialMediaConsent === true,
        p_test_mode: body.testMode === true,
        p_share_url: shareUrl,
        p_source_generation: sourceGeneration,
        p_template: template,
        p_source_assets: assets.map((asset) => ({
          slotIndex: asset.slotIndex,
          publicId: asset.publicId?.trim(),
          secureUrl: asset.secureUrl?.trim(),
          width: asset.width ?? null,
          height: asset.height ?? null,
          bytes: asset.bytes ?? null,
          format: asset.format?.trim() || null,
          storageProvider: normalizeProvider(asset.storageProvider),
          mirrorHorizontal: asset.mirrorHorizontal === true,
        })),
      },
    );
    if (jobError) throw jobError;
    const job = data as { id: string; status: string } | null;
    if (!job) {
      return jsonOk({ success: true, sessionId, shareUrl, skipped: true });
    }

    return jsonOk({
      success: true,
      sessionId,
      shareUrl,
      jobId: job.id,
      status: job.status,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function isAllowedSourceAsset(asset: LivePhotoSourceAsset) {
  const secureUrl = asset.secureUrl?.trim();
  if (!secureUrl || !isAllowedGallerySourceUrl(secureUrl)) return false;

  const bytes = Number(asset.bytes ?? 0);
  if (Number.isFinite(bytes) && bytes > MAX_LIVE_PHOTO_SOURCE_BYTES) {
    return false;
  }

  const format = asset.format?.trim().toLowerCase();
  if (!format) return true;
  return ["mp4", "mov", "webm", "jpg", "jpeg", "png", "webp"].includes(format);
}

function isAllowedGallerySourceUrl(value: string) {
  return isAllowedCloudinaryUrl(value) || isAllowedImageKitUrl(value);
}

function isAllowedCloudinaryUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "res.cloudinary.com") return false;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    if (!cloudName) return true;
    return url.pathname.startsWith(`/${cloudName}/`);
  } catch {
    return false;
  }
}

function isAllowedImageKitUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();
    if (endpoint) {
      const expected = new URL(endpoint);
      return url.hostname === expected.hostname;
    }

    return url.hostname.endsWith("imagekit.io");
  } catch {
    return false;
  }
}
