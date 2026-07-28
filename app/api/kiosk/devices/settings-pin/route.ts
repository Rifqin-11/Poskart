import { jsonError, jsonOk, requireKioskContext } from "@/lib/kiosk/server";
import { updateDeviceSettingsPin } from "@/lib/kiosk/settings-pin";

type SettingsPinRequestBody = {
  deviceId?: string;
  currentPin?: string;
  nextPin?: string;
  protectSettings?: boolean;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as SettingsPinRequestBody;
    return jsonOk(
      await updateDeviceSettingsPin(context, {
        deviceId: body.deviceId ?? "",
        currentPin: body.currentPin,
        nextPin: body.nextPin,
        protectSettings: body.protectSettings,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}
