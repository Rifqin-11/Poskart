import {
  createGalleryUploadSignatures,
  type GalleryUploadDescriptor,
} from "@/lib/gallery/storage-provider";
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
  templateId?: string;
  templateName?: string;
  themeName?: string;
  socialMediaConsent?: boolean;
  testMode?: boolean;
  files?: GalleryUploadDescriptor[];
};

/** Guards against a device claiming a template from another organization. */
async function resolveOwnedTemplateId(
  context: Awaited<ReturnType<typeof requireKioskContext>>,
  templateId: string | undefined,
) {
  const id = templateId?.trim();
  if (!id) return null;

  const { data } = await context.client
    .from("templates")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("id", id)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as SignBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
      { allowPaidSessionId: body.sessionId },
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

    // Binding the session to the template id keeps frame lookups working after
    // the frame is renamed. A missing/foreign id falls back to the database
    // trigger, which resolves it from `template_name`.
    const templateId = await resolveOwnedTemplateId(context, body.templateId);

    const shareUrl = getPublicGalleryUrl(sessionId);
    const { error: sessionError } = await context.client
      .from("gallery_sessions")
      .upsert({
        id: sessionId,
        organization_id: context.organizationId,
        device_id: device.id,
        layout_schema_id: device.layout_schema_id,
        ...(templateId ? { template_id: templateId } : {}),
        template_name: body.templateName?.trim() ?? "",
        theme_name: body.themeName?.trim() ?? "",
        social_media_consent: body.socialMediaConsent === true,
        test_mode: body.testMode === true,
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
      ...(await createGalleryUploadSignatures({
        organizationId: context.organizationId,
        sessionId,
        files,
      })),
      shareUrl,
    });
  } catch (error) {
    return jsonError(error);
  }
}
