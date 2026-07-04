import {
  createCloudinaryUploadSignatures,
  type CloudinaryUploadDescriptor,
} from "@/lib/cloudinary/server";
import { getPublicGalleryUrl } from "@/lib/gallery/urls";
import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type SignBody = {
  deviceId?: string;
  sessionId?: string;
  templateName?: string;
  themeName?: string;
  socialMediaConsent?: boolean;
  files?: CloudinaryUploadDescriptor[];
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as SignBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );

    const sessionId = body.sessionId?.trim() ?? "";
    const files = (body.files ?? []).filter(
      (file) =>
        (file.kind === "raw" ||
          file.kind === "framed" ||
          file.kind === "live_source") &&
        (file.resourceType == null ||
          file.resourceType === "image" ||
          file.resourceType === "video") &&
        Number.isInteger(file.photoIndex) &&
        file.photoIndex >= 0,
    );

    if (!sessionId || files.length > 30) {
      return jsonOk(
        {
          error: "A session ID and up to 30 valid files are required.",
          code: "KIOSK_GALLERY_UPLOAD_INVALID",
        },
        { status: 400 },
      );
    }

    const shareUrl = getPublicGalleryUrl(sessionId);
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
        updated_at: new Date().toISOString(),
    });
    if (sessionError) throw sessionError;

    if (files.length === 0) {
      return jsonOk({
        success: true,
        sessionId,
        shareUrl,
        uploads: [],
      });
    }

    return jsonOk({
      ...createCloudinaryUploadSignatures({
        organizationId: context.organizationId,
        sessionId,
        files,
      }),
      shareUrl,
    });
  } catch (error) {
    return jsonError(error);
  }
}
