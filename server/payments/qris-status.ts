export type DuitkuStatusLike = {
  status?: string | null;
  paid_at?: string | null;
  duitku_status_code?: string | null;
  gateway_response?: Record<string, unknown> | null;
};

export function isDuitkuTransactionPaid(
  transaction: DuitkuStatusLike | null | undefined,
) {
  if (!transaction) return false;
  if (transaction.status === "paid") return true;
  if (transaction.paid_at) return true;

  const gatewayResponse = transaction.gateway_response;
  if (!gatewayResponse || typeof gatewayResponse !== "object") return false;
  const hasQrCreationPayload = Boolean(
    gatewayResponse.qrString ||
      gatewayResponse.qr_string ||
      gatewayResponse.paymentUrl ||
      gatewayResponse.payment_url,
  );

  if (gatewayResponse.resultCode === "00") return true;

  return (
    transaction.duitku_status_code === "00" &&
    gatewayResponse.statusCode === "00" &&
    !hasQrCreationPayload
  );
}

export function normalizeQrisTransactionStatus<
  T extends { status?: string | null; provider?: string | null },
>(transaction: T): T {
  if (transaction.provider !== "QRIS") return transaction;
  if (!isDuitkuTransactionPaid(transaction)) return transaction;
  return { ...transaction, status: "paid" };
}
