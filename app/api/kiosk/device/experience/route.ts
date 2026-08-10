import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type DeviceExperienceSettingsBody = {
  deviceId?: string;
  socialMediaConsentEnabled?: boolean;
  emailDeliveryEnabled?: boolean;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as DeviceExperienceSettingsBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const patch: Record<string, boolean | string> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.socialMediaConsentEnabled === "boolean") {
      patch.social_media_consent_enabled = body.socialMediaConsentEnabled;
    }
    if (typeof body.emailDeliveryEnabled === "boolean") {
      patch.email_delivery_enabled = body.emailDeliveryEnabled;
    }
    if (Object.keys(patch).length === 1) {
      return jsonOk({
        success: true,
        socialMediaConsentEnabled: device.social_media_consent_enabled,
        emailDeliveryEnabled: device.email_delivery_enabled,
      });
    }

    const { error } = await context.client
      .from("devices")
      .update(patch)
      .eq("id", device.id)
      .eq("organization_id", context.organizationId);

    if (error) throw error;
    return jsonOk({
      success: true,
      socialMediaConsentEnabled:
        body.socialMediaConsentEnabled ??
        device.social_media_consent_enabled,
      emailDeliveryEnabled:
        body.emailDeliveryEnabled ?? device.email_delivery_enabled,
    });
  } catch (error) {
    return jsonError(error);
  }
}
