import { fetchColorKeyImageBlob } from "@/features/builder/utils/color-key-image-source";

export type PhotoSlotMarkerMode = "auto" | "custom";

export type DetectedPhotoSlot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  coverage: number;
  markerColor: string;
};

export type PhotoSlotDetectionResult = {
  candidates: DetectedPhotoSlot[];
  imageWidth: number;
  imageHeight: number;
  markerColor: string;
  markerMode: "green" | "blue" | "custom";
};

type PixelSource = Pick<ImageData, "data" | "width" | "height">;
type MarkerFamily = "green" | "blue" | "custom";

type Component = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
  redTotal: number;
  greenTotal: number;
  blueTotal: number;
};

export async function detectPhotoSlotsFromImage(
  source: string,
  options: {
    mode: PhotoSlotMarkerMode;
    sensitivity: number;
    customColor?: string;
  },
): Promise<PhotoSlotDetectionResult> {
  const { image, objectUrl } = await loadDetectionImage(source);
  try {
    const maxAnalysisSide = 1000;
    const scale = Math.min(
      1,
      maxAnalysisSide / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas tidak tersedia di browser ini.");
    context.drawImage(image, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height);
    const sensitivity = Math.min(100, Math.max(0, options.sensitivity));
    const families: MarkerFamily[] =
      options.mode === "auto" ? ["green", "blue"] : ["custom"];
    const customColor =
      options.mode === "custom" ? parseMarkerColor(options.customColor) : null;
    const detections = families.map((family) =>
      detectFamily(pixels, family, sensitivity, customColor),
    );
    const best = detections.sort((a, b) => b.score - a.score)[0];
    if (!best || best.components.length === 0) {
      throw new Error(
        options.mode === "custom"
          ? "Tidak menemukan area dengan warna Custom yang cukup besar dan berbentuk persegi."
          : "Tidak menemukan area hijau atau biru yang cukup besar dan berbentuk persegi.",
      );
    }

    const candidates = sortComponents(best.components).map(
      (component, index): DetectedPhotoSlot => {
        const componentWidth = component.maxX - component.minX + 1;
        const componentHeight = component.maxY - component.minY + 1;
        return {
          id: `detected-slot-${index + 1}`,
          x: component.minX / width,
          y: component.minY / height,
          width: componentWidth / width,
          height: componentHeight / height,
          coverage:
            component.pixelCount /
            Math.max(1, componentWidth * componentHeight),
          markerColor: averageComponentColor([component]),
        };
      },
    );

    return {
      candidates,
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      markerColor: averageComponentColor(best.components),
      markerMode: best.family,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function detectFamily(
  pixels: PixelSource,
  family: MarkerFamily,
  sensitivity: number,
  customColor: RgbColor | null,
) {
  const { data, width, height } = pixels;
  const pixelTotal = width * height;
  const mask = new Uint8Array(pixelTotal);
  for (let pixelIndex = 0; pixelIndex < pixelTotal; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    if (
      isMarkerPixel(
        data[dataIndex] ?? 0,
        data[dataIndex + 1] ?? 0,
        data[dataIndex + 2] ?? 0,
        family,
        sensitivity,
        customColor,
      )
    ) {
      mask[pixelIndex] = 1;
    }
  }

  const queue = new Int32Array(pixelTotal);
  const components: Component[] = [];
  const minimumArea = Math.max(80, Math.round(pixelTotal * 0.003));
  const minimumWidth = Math.max(8, Math.round(width * 0.025));
  const minimumHeight = Math.max(8, Math.round(height * 0.025));

  for (let start = 0; start < pixelTotal; start += 1) {
    if (mask[start] !== 1) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    mask[start] = 0;
    const component: Component = {
      minX: width,
      minY: height,
      maxX: 0,
      maxY: 0,
      pixelCount: 0,
      redTotal: 0,
      greenTotal: 0,
      blueTotal: 0,
    };

    while (head < tail) {
      const pixelIndex = queue[head++] ?? 0;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      const dataIndex = pixelIndex * 4;
      component.minX = Math.min(component.minX, x);
      component.minY = Math.min(component.minY, y);
      component.maxX = Math.max(component.maxX, x);
      component.maxY = Math.max(component.maxY, y);
      component.pixelCount += 1;
      component.redTotal += data[dataIndex] ?? 0;
      component.greenTotal += data[dataIndex + 1] ?? 0;
      component.blueTotal += data[dataIndex + 2] ?? 0;

      if (x > 0) tail = enqueue(pixelIndex - 1, mask, queue, tail);
      if (x + 1 < width) tail = enqueue(pixelIndex + 1, mask, queue, tail);
      if (y > 0) tail = enqueue(pixelIndex - width, mask, queue, tail);
      if (y + 1 < height) {
        tail = enqueue(pixelIndex + width, mask, queue, tail);
      }
    }

    const componentWidth = component.maxX - component.minX + 1;
    const componentHeight = component.maxY - component.minY + 1;
    const boxArea = componentWidth * componentHeight;
    const coverage = component.pixelCount / Math.max(1, boxArea);
    const aspectRatio = componentWidth / Math.max(1, componentHeight);
    if (
      component.pixelCount >= minimumArea &&
      componentWidth >= minimumWidth &&
      componentHeight >= minimumHeight &&
      coverage >= 0.58 &&
      aspectRatio >= 0.15 &&
      aspectRatio <= 6
    ) {
      components.push(component);
    }
  }

  return {
    family,
    components,
    score: components.reduce(
      (total, component) => total + component.pixelCount,
      0,
    ),
  };
}

function enqueue(
  pixelIndex: number,
  mask: Uint8Array,
  queue: Int32Array,
  tail: number,
) {
  if (mask[pixelIndex] !== 1) return tail;
  mask[pixelIndex] = 0;
  queue[tail] = pixelIndex;
  return tail + 1;
}

function isMarkerPixel(
  red: number,
  green: number,
  blue: number,
  family: MarkerFamily,
  sensitivity: number,
  customColor: RgbColor | null,
) {
  if (family === "custom") {
    if (!customColor) return false;
    const distance = Math.sqrt(
      (red - customColor.red) ** 2 +
        (green - customColor.green) ** 2 +
        (blue - customColor.blue) ** 2,
    );
    return distance <= 18 + sensitivity * 1.15;
  }

  const hsv = rgbToHsv(red, green, blue);
  const rangeBoost = sensitivity * 0.25;
  const saturationFloor = Math.max(0.2, 0.58 - sensitivity * 0.004);
  const valueFloor = Math.max(0.18, 0.38 - sensitivity * 0.002);
  if (hsv.s < saturationFloor || hsv.v < valueFloor) return false;

  if (family === "green") {
    return hsv.h >= 82 - rangeBoost && hsv.h <= 158 + rangeBoost;
  }
  return hsv.h >= 190 - rangeBoost && hsv.h <= 250 + rangeBoost;
}

type RgbColor = { red: number; green: number; blue: number };

function parseMarkerColor(value: string | undefined): RgbColor {
  const color = value?.trim() ?? "";
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error("Masukkan warna Custom dalam format HEX, contoh #FF00FF.");
  }
  const parsed = Number.parseInt(color.slice(1), 16);
  return {
    red: (parsed >> 16) & 255,
    green: (parsed >> 8) & 255,
    blue: parsed & 255,
  };
}

function rgbToHsv(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function sortComponents(components: Component[]) {
  return [...components].sort((a, b) => {
    const heightA = a.maxY - a.minY + 1;
    const heightB = b.maxY - b.minY + 1;
    const sameRow =
      Math.abs(a.minY - b.minY) < Math.min(heightA, heightB) * 0.35;
    return sameRow ? a.minX - b.minX : a.minY - b.minY;
  });
}

function averageComponentColor(components: Component[]) {
  const totals = components.reduce(
    (output, component) => ({
      count: output.count + component.pixelCount,
      red: output.red + component.redTotal,
      green: output.green + component.greenTotal,
      blue: output.blue + component.blueTotal,
    }),
    { count: 0, red: 0, green: 0, blue: 0 },
  );
  const hex = (value: number) =>
    Math.round(value / Math.max(1, totals.count))
      .toString(16)
      .padStart(2, "0");
  return `#${hex(totals.red)}${hex(totals.green)}${hex(totals.blue)}`.toUpperCase();
}

async function loadDetectionImage(source: string) {
  const blob = await fetchColorKeyImageBlob(source);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Ukuran gambar frame tidak dapat dibaca.");
    }
    return { image, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}
