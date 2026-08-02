export type GatewayFeeType = "percentage" | "fixed";

export type GatewayFeeSettings = {
  gatewayFeeType: GatewayFeeType;
  gatewayFeePercentage: number;
  gatewayFeeFixedAmount: number;
};

export const DEFAULT_GATEWAY_FEE_SETTINGS: GatewayFeeSettings = {
  gatewayFeeType: "percentage",
  gatewayFeePercentage: 0,
  gatewayFeeFixedAmount: 0,
};

export function normalizeGatewayFeeSettings(input?: {
  gatewayFeeType?: unknown;
  gatewayFeePercentage?: unknown;
  gatewayFeeFixedAmount?: unknown;
} | null): GatewayFeeSettings {
  return {
    gatewayFeeType:
      input?.gatewayFeeType === "fixed" ? "fixed" : "percentage",
    gatewayFeePercentage: normalizePercentage(input?.gatewayFeePercentage),
    gatewayFeeFixedAmount: normalizeMoney(input?.gatewayFeeFixedAmount),
  };
}

export function calculatePaymentGatewayFee(
  grossAmount: number,
  settings?: GatewayFeeSettings | null,
) {
  const normalizedGrossAmount = normalizeMoney(grossAmount);
  const normalizedSettings = normalizeGatewayFeeSettings(settings);

  if (normalizedSettings.gatewayFeeType === "fixed") {
    return normalizedSettings.gatewayFeeFixedAmount;
  }

  return Math.max(
    0,
    Math.round(
      (normalizedGrossAmount * normalizedSettings.gatewayFeePercentage) / 100,
    ),
  );
}

function normalizePercentage(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function normalizeMoney(value: unknown) {
  const parsed = Math.round(Number(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}
