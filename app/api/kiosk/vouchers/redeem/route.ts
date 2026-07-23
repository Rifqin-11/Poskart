import {
  jsonError,
  jsonOk,
  KioskApiError,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type RedeemVoucherBody = {
  deviceId?: string;
  code?: string;
  clientEventId?: string;
  redeemedAt?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RedeemVoucherBody;
    const context = await requireKioskContext(request);
    const device = await requireOrganizationDevice(context, body.deviceId ?? "");
    const code = body.code?.trim().toUpperCase();
    const clientEventId = body.clientEventId?.trim();
    const redeemedAt = body.redeemedAt ? new Date(body.redeemedAt) : new Date();
    if (!code || !clientEventId || Number.isNaN(redeemedAt.getTime())) {
      throw new KioskApiError("Voucher redemption payload is invalid.", 400, "VOUCHER_REDEMPTION_INVALID");
    }

    const { data: allocations, error: lookupError } = await context.client
      .from("voucher_allocations")
      .select("id,voucher_codes(id,code,reusable,redemption_count)")
      .eq("organization_id", context.organizationId)
      .eq("device_id", device.id);
    if (lookupError) throw lookupError;
    const match = (allocations ?? []).flatMap((allocation) =>
      (allocation.voucher_codes ?? []).map((voucher) => ({
        allocationId: allocation.id,
        voucher,
      })),
    ).find((item) => item.voucher.code.toUpperCase() === code);
    if (!match) {
      throw new KioskApiError("Voucher is not allocated to this device.", 403, "VOUCHER_NOT_ALLOCATED");
    }
    if (!match.voucher.reusable && match.voucher.redemption_count > 0) {
      throw new KioskApiError("Voucher has already been used.", 409, "VOUCHER_ALREADY_USED");
    }

    const { error: redemptionError } = await context.client
      .from("voucher_redemptions")
      .insert({
        organization_id: context.organizationId,
        voucher_code_id: match.voucher.id,
        allocation_id: match.allocationId,
        device_id: device.id,
        client_event_id: clientEventId,
        redeemed_at: redeemedAt.toISOString(),
      });
    if (redemptionError?.code === "23505") return jsonOk({ duplicate: true });
    if (redemptionError) throw redemptionError;

    const { error: updateError } = await context.client
      .from("voucher_codes")
      .update({
        redemption_count: match.voucher.redemption_count + 1,
        last_redeemed_at: redeemedAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.voucher.id);
    if (updateError) throw updateError;

    return jsonOk({ redeemed: true });
  } catch (error) {
    return jsonError(error);
  }
}
