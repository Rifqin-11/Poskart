import {
  cancelDevicePairing,
  createDevicePairing,
  getDevicePairingStatus,
} from "@/lib/kiosk/device-pairings";
import { jsonError, jsonOk, requireKioskContext } from "@/lib/kiosk/server";

type PairingBody = {
  hardwareId?: string;
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as PairingBody;
    return jsonOk(await createDevicePairing(context, body.hardwareId ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const hardwareId = new URL(request.url).searchParams.get("hardwareId") ?? "";
    return jsonOk(await getDevicePairingStatus(context, hardwareId));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const hardwareId = new URL(request.url).searchParams.get("hardwareId") ?? "";
    await cancelDevicePairing(context, hardwareId);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
