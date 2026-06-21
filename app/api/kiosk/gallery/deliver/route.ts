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
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^\+?[0-9][0-9\s().-]{7,}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as DeliverBody;
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
