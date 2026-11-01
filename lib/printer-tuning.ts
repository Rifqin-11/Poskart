export const PRINTER_TUNING_LIMITS = {
  bottomSafeZoneMm: { min: 0, max: 24, step: 1 },
  brightness: { min: -100, max: 100, step: 1 },
  contrast: { min: -100, max: 100, step: 1 },
  dotDensity: { min: 0.5, max: 1.5, step: 0.05 },
  shadowLift: { min: 0, max: 100, step: 1 },
  darkSmoothing: { min: 0, max: 100, step: 1 },
  localContrast: { min: 0, max: 100, step: 1 },
  backgroundLift: { min: 0, max: 100, step: 1 },
} as const;

export const PRINTER_PRESETS = {
  outdoor_day: {
    label: "Outdoor / Siang",
    description: "Untuk foto luar ruangan atau kondisi cahaya cukup.",
    brightness: 10,
    contrast: 15,
    sharpness: 19,
    darkSmoothing: 32,
    localContrast: 20,
    backgroundLift: 30,
    dotDensity: 0.9,
  },
  night: {
    label: "Malam",
    description: "Untuk kondisi malam dengan cahaya terbatas.",
    brightness: 15,
    contrast: 12,
    sharpness: 19,
    darkSmoothing: 32,
    localContrast: 20,
    backgroundLift: 35,
    dotDensity: 0.9,
  },
  very_dark: {
    label: "Gelap banget",
    description: "Untuk kondisi sangat gelap atau hampir tanpa cahaya.",
    brightness: 20,
    contrast: 10,
    sharpness: 19,
    darkSmoothing: 32,
    localContrast: 20,
    backgroundLift: 40,
    dotDensity: 0.9,
  },
} as const;

export type PrinterPresetId = keyof typeof PRINTER_PRESETS | "advanced";

export function normalizePrinterPreset(value: unknown): PrinterPresetId {
  return typeof value === "string" &&
      (value === "advanced" || value in PRINTER_PRESETS)
    ? (value as PrinterPresetId)
    : "advanced";
}

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
