import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

/**
 * Returns only the public Supabase credentials needed by the Flutter
 * Realtime client. Data reads and writes still go through /api/kiosk/*.
 */
export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const deviceId = new URL(request.url).searchParams.get("deviceId") ?? "";
    await requireOrganizationDevice(context, deviceId);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new Error("Supabase Realtime is not configured.");
    }

    return jsonOk({ url, publishableKey, deviceId: deviceId.trim() });
  } catch (error) {
    return jsonError(error);
  }
}
