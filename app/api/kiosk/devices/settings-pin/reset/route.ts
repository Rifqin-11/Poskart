import { jsonError, jsonOk, requireKioskContext } from "@/lib/kiosk/server";
import { requestSettingsPinReset } from "@/lib/kiosk/settings-pin";

type ResetRequestBody = {
  deviceId?: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as ResetRequestBody;
    return jsonOk(await requestSettingsPinReset(context, body.deviceId ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}
