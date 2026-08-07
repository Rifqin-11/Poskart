import {
  cancelDevicePairing,
  createDevicePairing,
  createPublicDevicePairing,
  getDevicePairingStatus,
  getPublicDevicePairingStatus,
  hashHardwareId,
} from "@/lib/kiosk/device-pairings";
import {
  jsonError,
  jsonOk,
  KioskApiError,
  requireKioskContext,
} from "@/lib/kiosk/server";
import { checkRateLimit } from "@/lib/rate-limit";

type PairingBody = {
  hardwareId?: string;
};

function publicPairingRequest(request: Request) {
  return !request.headers.get("authorization");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PairingBody;
    if (publicPairingRequest(request)) {
      // The hardware hash limits anonymous code creation without exposing a
      // reusable account credential to an unpaired tablet.
      const rl = await checkRateLimit(
        `pairing:public:${hashHardwareId(body.hardwareId ?? "unknown")}`,
        3600,
        3,
      );
      if (!rl.allowed) return rl.response;
      return jsonOk(await createPublicDevicePairing(body.hardwareId ?? ""));
    }
    const context = await requireKioskContext(request);
    if (context.deviceTokenDeviceId) {
      throw new KioskApiError(
        "A paired device cannot create another pairing request.",
        403,
        "KIOSK_DEVICE_TOKEN_SCOPE_DENIED",
      );
    }
    // 5 pairing requests per org per hour
    const rl = await checkRateLimit(`pairing:${context.organizationId}`, 3600, 5);
    if (!rl.allowed) return rl.response;
    return jsonOk(await createDevicePairing(context, body.hardwareId ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    if (publicPairingRequest(request)) {
      const pairingId = searchParams.get("pairingId") ?? "unknown";
      const rl = await checkRateLimit(`pairing:poll:${pairingId}`, 60, 40);
      if (!rl.allowed) return rl.response;
      return jsonOk(
        await getPublicDevicePairingStatus(
          pairingId,
          request.headers.get("x-poskart-pairing-secret") ?? "",
        ),
      );
    }
    const context = await requireKioskContext(request);
    const hardwareId = searchParams.get("hardwareId") ?? "";
    return jsonOk(await getDevicePairingStatus(context, hardwareId));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireKioskContext(request);
    if (context.deviceTokenDeviceId) {
      throw new KioskApiError(
        "A paired device cannot cancel pairing requests.",
        403,
        "KIOSK_DEVICE_TOKEN_SCOPE_DENIED",
      );
    }
    const hardwareId = new URL(request.url).searchParams.get("hardwareId") ?? "";
    await cancelDevicePairing(context, hardwareId);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
