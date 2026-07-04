import type { ColorKeySettings } from "@/types/color-key";

export const DEFAULT_COLOR_KEY: ColorKeySettings = {
  enabled: false,
  color: "#00ff00",
  tolerance: 32,
  softness: 12,
  smoothness: 2,
};

export function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeHexColor(value: unknown, fallback = DEFAULT_COLOR_KEY.color) {
  if (typeof value !== "string") return fallback;
  const hex = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex
      .slice(1)
      .split("")
      .map((part) => part + part)
      .join("")}`.toUpperCase();
  }
  return fallback;
}

export function normalizeColorKey(value: unknown): ColorKeySettings {
  const source =
    value && typeof value === "object"
      ? (value as Partial<ColorKeySettings>)
      : {};

  return {
    enabled: Boolean(source.enabled),
    color: normalizeHexColor(source.color),
    tolerance: clampNumber(
      source.tolerance,
      0,
      255,
      DEFAULT_COLOR_KEY.tolerance,
    ),
    softness: clampNumber(
      source.softness,
      0,
      100,
      DEFAULT_COLOR_KEY.softness,
    ),
    smoothness: clampNumber(
      source.smoothness,
      0,
      20,
      DEFAULT_COLOR_KEY.smoothness ?? 2,
    ),
  };
}

export function isColorKeyEnabled(value: unknown) {
  return normalizeColorKey(value).enabled;
}

export function parseHexColor(value: string) {
  const hex = normalizeHexColor(value).slice(1);
  const int = Number.parseInt(hex, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function applyColorKeyToImageData(
  imageData: ImageData,
  settings: ColorKeySettings,
) {
  if (!settings.enabled) return imageData;

  const key = parseHexColor(settings.color);
  if (!key) return imageData;

  const data = imageData.data;
  const tolerance = clampNumber(settings.tolerance, 0, 255, 32);
  const softness = clampNumber(settings.softness, 0, 100, 12);
  const smoothness = clampNumber(settings.smoothness, 0, 20, 2);
  const cleanupStrength = Math.min(1, Math.max(0, (tolerance - 32) / 223));
  const effectiveTolerance = tolerance + cleanupStrength * 130;
  const keyHsv = rgbToHsv(key.r, key.g, key.b);
  const featherStart = Math.max(0, effectiveTolerance - softness);
  const featherRange = Math.max(1, effectiveTolerance - featherStart);

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 255;
    const distance = Math.sqrt(
      (red - key.r) ** 2 + (green - key.g) ** 2 + (blue - key.b) ** 2,
    );

    if (
      !isLikelyColorKeyPixel(
        red,
        green,
        blue,
        keyHsv,
        tolerance,
        softness,
        cleanupStrength,
      )
    ) {
      continue;
    }

    if (distance <= featherStart) {
      data[index + 3] = 0;
    } else if (distance <= effectiveTolerance) {
      data[index + 3] = Math.round(alpha * ((distance - featherStart) / featherRange));
    }
  }

  if (smoothness > 0) {
    smoothAlphaChannel(imageData, smoothness);
  }

  return imageData;
}

function isLikelyColorKeyPixel(
  red: number,
  green: number,
  blue: number,
  keyHsv: HsvColor,
  tolerance: number,
  softness: number,
  cleanupStrength = 0,
) {
  if (keyHsv.s < 0.12) return true;

  const pixelHsv = rgbToHsv(red, green, blue);
  const saturationFloor = Math.max(
    0.015,
    keyHsv.s * (0.2 - cleanupStrength * 0.18),
  );

  const hueDelta = Math.min(
    Math.abs(pixelHsv.h - keyHsv.h),
    360 - Math.abs(pixelHsv.h - keyHsv.h),
  );
  const hueLimit =
    Math.min(92, Math.max(8, tolerance * 0.35 + softness * 0.1)) +
    cleanupStrength * 18;
  const greenDominance = green - Math.max(red, blue);
  const allowsSoftSpill =
    cleanupStrength > 0.35 &&
    keyHsv.h >= 70 &&
    keyHsv.h <= 180 &&
    greenDominance > -18 * cleanupStrength &&
    pixelHsv.h >= 70 &&
    pixelHsv.h <= 185;

  if (pixelHsv.s < saturationFloor && !allowsSoftSpill) return false;
  return hueDelta <= hueLimit || allowsSoftSpill;
}

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

function rgbToHsv(red: number, green: number, blue: number): HsvColor {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function smoothAlphaChannel(imageData: ImageData, radius: number) {
  const { data, width, height } = imageData;
  const sourceAlpha = new Uint8ClampedArray(width * height);
  const horizontal = new Uint8ClampedArray(width * height);

  for (let index = 0; index < sourceAlpha.length; index += 1) {
    sourceAlpha[index] = data[index * 4 + 3] ?? 255;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleX = x + offset;
        if (sampleX < 0 || sampleX >= width) continue;
        sum += sourceAlpha[y * width + sampleX] ?? 0;
        count += 1;
      }
      horizontal[y * width + x] = Math.round(sum / count);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleY = y + offset;
        if (sampleY < 0 || sampleY >= height) continue;
        sum += horizontal[sampleY * width + x] ?? 0;
        count += 1;
      }
      data[(y * width + x) * 4 + 3] = Math.round(sum / count);
    }
  }
}

export function drawImageFitted(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  fit: string,
) {
  if (fit === "fill") {
    ctx.drawImage(image, 0, 0, width, height);
    return;
  }

  const scale =
    fit === "contain"
      ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
      : Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}
