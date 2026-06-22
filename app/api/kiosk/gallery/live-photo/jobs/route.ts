import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { getPublicGalleryUrl } from "@/lib/gallery/urls";

type LivePhotoSourceAsset = {
  slotIndex?: number;
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
};

type LivePhotoJobBody = {
  deviceId?: string;
  sessionId?: string;
  templateName?: string;
  themeName?: string;
  socialMediaConsent?: boolean;
  template?: Record<string, unknown>;
  assets?: LivePhotoSourceAsset[];
};

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
        Boolean(asset.secureUrl?.startsWith("https://")),
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
          })),
          status: "queued",
          error_message: null,
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
