import {
  jsonError,
  jsonOk,
  readBearerToken,
  revokeKioskSession,
} from "@/lib/kiosk/server";

export async function POST(request: Request) {
  try {
    const accessToken = readBearerToken(request);
    await revokeKioskSession(accessToken);
    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
