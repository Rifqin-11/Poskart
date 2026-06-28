export const PRINTER_TUNING_LIMITS = {
  bottomSafeZoneMm: { min: 0, max: 24, step: 1 },
  brightness: { min: -100, max: 100, step: 1 },
  contrast: { min: -100, max: 100, step: 1 },
  dotDensity: { min: 0.5, max: 1.5, step: 0.05 },
} as const;

export function clampPrinterTuningValue(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

