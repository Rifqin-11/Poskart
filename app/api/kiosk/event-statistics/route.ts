import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { getEventStatisticsForOrganization } from "@/server/admin/event-statistics";

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId") ?? "";
    await requireOrganizationDevice(context, deviceId);

    const statistics = await getEventStatisticsForOrganization(
      context.client,
      context.organizationId,
    );

    return jsonOk({ statistics });
  } catch (error) {
    return jsonError(error);
  }
}
