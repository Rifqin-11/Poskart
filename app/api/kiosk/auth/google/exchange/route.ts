import {
  consumeKioskOAuthTicket,
} from "@/lib/kiosk/oauth";
import { jsonError, jsonOk, KioskApiError } from "@/lib/kiosk/server";

type ExchangeBody = {
  code?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExchangeBody;
    const code = body.code?.trim() ?? "";
    if (!code) {
      throw new KioskApiError(
        "Google login code is required.",
        400,
        "KIOSK_GOOGLE_CODE_REQUIRED",
      );
    }

    return jsonOk(await consumeKioskOAuthTicket(code));
  } catch (error) {
    return jsonError(error);
  }
}
