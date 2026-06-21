import { deliverGalleryLink } from "@/lib/delivery/gallery-delivery";
import { getPublicGalleryUrl } from "@/lib/gallery/urls";
import {
  jsonError,
  jsonOk,
  KioskApiError,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type DeliverBody = {
  deviceId?: string;
  sessionId?: string;
  email?: string;
  phone?: string;
  emailAttachment?: {
    filename: string;
    contentBase64: string;
  };
};

const MAX_EMAIL_ATTACHMENT_BYTES = 4 * 1024 * 1024;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^\+?[0-9][0-9\s().-]{7,}$/.test(value);
}

function formString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
}

function safeAttachmentFilename(value: string) {
  const sanitized = value.replace(/[^a-zA-Z0-9_.-]+/g, "-").slice(0, 96);
  return sanitized || "poskart-framed-photo.png";
}

function attachmentExtension(content: Buffer) {
  const isJpeg =
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff;
  if (isJpeg) return "jpg";

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const isPng =
    content.length >= pngSignature.length &&
    pngSignature.every((byte, index) => content[index] === byte);
  if (isPng) return "png";

  return null;
}

async function readDeliverBody(request: Request): Promise<DeliverBody> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    const body = (await request.json()) as DeliverBody;
    return {
      deviceId: body.deviceId,
      sessionId: body.sessionId,
      email: body.email,
      phone: body.phone,
    };
  }

  const form = await request.formData();
  const body: DeliverBody = {
    deviceId: formString(form, "deviceId"),
    sessionId: formString(form, "sessionId"),
    email: formString(form, "email"),
    phone: formString(form, "phone"),
  };

  const framedPhoto = form.get("framedPhoto");
  if (framedPhoto instanceof File && framedPhoto.size > 0) {
    if (framedPhoto.size > MAX_EMAIL_ATTACHMENT_BYTES) {
      throw new KioskApiError(
        "File foto terlalu besar untuk dikirim via email.",
        400,
        "KIOSK_GALLERY_DELIVERY_ATTACHMENT_TOO_LARGE",
      );
    }

    const content = Buffer.from(await framedPhoto.arrayBuffer());
    const extension = attachmentExtension(content);
    if (!extension) {
      throw new KioskApiError(
        "Lampiran foto harus berupa file JPEG atau PNG.",
        400,
        "KIOSK_GALLERY_DELIVERY_ATTACHMENT_INVALID",
      );
    }

    body.emailAttachment = {
      filename: safeAttachmentFilename(
        `${body.sessionId || "poskart"}-framed-photo.${extension}`,
      ),
      contentBase64: content.toString("base64"),
    };
  }

  return body;
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = await readDeliverBody(request);
    await requireOrganizationDevice(context, body.deviceId ?? "");

    const sessionId = body.sessionId?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";

    if (!sessionId) {
      throw new KioskApiError(
        "Session ID wajib diisi.",
        400,
        "KIOSK_GALLERY_DELIVERY_SESSION_REQUIRED",
      );
    }
    if (!email && !phone) {
      throw new KioskApiError(
        "Isi email atau nomor WhatsApp pelanggan.",
        400,
        "KIOSK_GALLERY_DELIVERY_CONTACT_REQUIRED",
      );
    }
    if (email && !isValidEmail(email)) {
      throw new KioskApiError(
        "Format email pelanggan belum valid.",
        400,
        "KIOSK_GALLERY_DELIVERY_EMAIL_INVALID",
      );
    }
    if (phone && !isValidPhone(phone)) {
      throw new KioskApiError(
        "Format nomor WhatsApp pelanggan belum valid.",
        400,
        "KIOSK_GALLERY_DELIVERY_PHONE_INVALID",
      );
    }

    const { data: session, error: sessionError } = await context.client
      .from("gallery_sessions")
      .select("id,template_name,theme_name,share_url")
      .eq("id", sessionId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      throw new KioskApiError(
        "Sesi gallery tidak ditemukan.",
        404,
        "KIOSK_GALLERY_DELIVERY_SESSION_NOT_FOUND",
      );
    }

    const shareUrl = session.share_url || getPublicGalleryUrl(sessionId);
    const result = await deliverGalleryLink({
      eventName: session.theme_name || session.template_name || "POSKART",
      shareUrl,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(email && body.emailAttachment
        ? { emailAttachment: body.emailAttachment }
        : {}),
    });
    const sent = result.email?.sent === true || result.whatsapp?.sent === true;

    return jsonOk({
      success: sent,
      shareUrl,
      ...(!sent
        ? {
            error:
              result.email?.error ??
              result.whatsapp?.error ??
              "Pengiriman link softfile gagal.",
          }
        : {}),
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
