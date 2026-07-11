import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { getPublicGalleryUrl } from "@/lib/gallery/urls";
import { normalizeProvider, type GalleryStorageProvider } from "@/lib/gallery/storage-provider";

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
    const now = new Date().toISOString();

    const { error: sessionError } = await context.client
      .from("gallery_sessions")
      .upsert({
        id: sessionId,
        organization_id: context.organizationId,
        device_id: device.id,
        template_name: body.templateName?.trim() ?? "",
        theme_name: body.themeName?.trim() ?? "",
        social_media_consent: body.socialMediaConsent === true,
        test_mode: body.testMode === true,
        share_url: shareUrl,
        updated_at: now,
      });
    if (sessionError) throw sessionError;

    const { data: job, error: jobError } = await context.client
      .from("live_photo_render_jobs")
      .upsert(
        {
          session_id: sessionId,
          organization_id: context.organizationId,
          device_id: device.id,
          template_name: body.templateName?.trim() ?? "",
          theme_name: body.themeName?.trim() ?? "",
          social_media_consent: body.socialMediaConsent === true,
          template,
          source_assets: assets.map((asset) => ({
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
          status: "queued",
          attempts: 0,
          output_public_id: null,
          output_secure_url: null,
          output_width: null,
          output_height: null,
          output_bytes: null,
          output_format: null,
          error_message: null,
          started_at: null,
          completed_at: null,
          updated_at: now,
        },
        { onConflict: "session_id" },
      )
      .select("id,status")
      .single();
    if (jobError) throw jobError;

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
