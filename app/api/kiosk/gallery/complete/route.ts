import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { getPublicGalleryUrl } from "@/lib/gallery/urls";

type UploadedAsset = {
  kind?: "raw" | "framed";
  photoIndex?: number;
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  resourceType?: "image" | "video";
};

type CompleteBody = {
  deviceId?: string;
  sessionId?: string;
  templateName?: string;
  themeName?: string;
  socialMediaConsent?: boolean;
  testMode?: boolean;
  assets?: UploadedAsset[];
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as CompleteBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const sessionId = body.sessionId?.trim() ?? "";
    const assets = (body.assets ?? []).filter(
      (asset) =>
        (asset.kind === "raw" || asset.kind === "framed") &&
        Number.isInteger(asset.photoIndex) &&
        Boolean(asset.publicId?.trim()) &&
        Boolean(asset.secureUrl?.startsWith("https://")),
    );

    if (!sessionId || assets.length === 0) {
      return jsonOk(
        {
          error: "A session ID and uploaded assets are required.",
          code: "KIOSK_GALLERY_COMPLETE_INVALID",
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

    const { error: photoError } = await context.client
      .from("gallery_photos")
      .upsert(
        assets.map((asset) => ({
          session_id: sessionId,
          organization_id: context.organizationId,
          kind: asset.kind,
          photo_index: Math.max(0, asset.photoIndex ?? 0),
          cloudinary_public_id: asset.publicId!.trim(),
          secure_url: asset.secureUrl!.trim(),
          width: asset.width ?? null,
          height: asset.height ?? null,
          bytes: asset.bytes ?? null,
          format: asset.format?.trim() || null,
        })),
        { onConflict: "session_id,kind,photo_index" },
      );
    if (photoError) throw photoError;

    return jsonOk({ success: true, sessionId, shareUrl });
  } catch (error) {
    return jsonError(error);
  }
}
