/** Browser-only simulation of the kiosk's USB raster pipeline. Input is already
 * resized to 384/576 dots. Canvas resampling can differ slightly from Dart image.
 * No auto exposure, histogram normalization, or background detection is used. */
export type ThermalPreviewOptions = {
  brightness: number;
  contrast: number;
  dotDensity: number;
  shadowLift: number;
  sharpness: number;
  printStyle: "smooth" | "retro" | "thermal_photo";
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const byte = (v: number) => Math.trunc(clamp(v, 0, 255));
const luminance = (rgb: Uint8Array, i: number) => .299 * rgb[i] + .587 * rgb[i + 1] + .114 * rgb[i + 2];

// Same radius-1 separable Gaussian used by Dart image (sigma = 2/3).
function blur(rgb: Uint8Array, width: number, height: number) {
  const edge = Math.exp(-1 / (2 * (2 / 3) ** 2));
  const weights = [edge / (1 + 2 * edge), 1 / (1 + 2 * edge), edge / (1 + 2 * edge)];
  let source = rgb;
  const reflect = (v: number, max: number) => max === 1 ? 0 : v < 0 ? -v : v >= max ? 2 * max - v - 1 : v;
  for (const horizontal of [true, false]) {
    const target = new Uint8Array(rgb.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -1; k <= 1; k++) {
          const sx = horizontal ? reflect(x + k, width) : x;
          const sy = horizontal ? y : reflect(y + k, height);
          sum += source[(sy * width + sx) * 3 + c] * weights[k + 1];
        }
        target[(y * width + x) * 3 + c] = byte(sum);
      }
    }
    source = target;
  }
  return source;
}

export function thermalPreviewRaster(
  rgba: Uint8ClampedArray, width: number, height: number,
  options: ThermalPreviewOptions,
): Uint8ClampedArray {
  if (width < 1 || height < 1 || width * height > 4_000_000 || rgba.length !== width * height * 4) {
    throw new Error("Ukuran foto preview tidak didukung.");
  }
  const photo = options.printStyle === "thermal_photo";
  let rgb: Uint8Array = new Uint8Array(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    const alpha = rgba[p * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) rgb[p * 3 + c] = byte(rgba[p * 4 + c] * alpha + 255 * (1 - alpha));
    if (photo) {
      const gray = byte(luminance(rgb, p * 3));
      rgb.fill(gray, p * 3, p * 3 + 3);
    }
  }
  if (photo) rgb = blur(rgb, width, height);
  const brightness = 1 + clamp(options.brightness + (photo ? 10 : 0), -100, 100) / 100;
  const contrast = 1 + clamp(options.contrast - (photo ? 12 : 0), -100, 100) / 100;
  for (let i = 0; i < rgb.length; i++) {
    let value = .5 * (1 - contrast) + rgb[i] / 255 * brightness * contrast;
    if (photo) value = value < 0 ? 1 : value ** .92;
    rgb[i] = byte(value * 255);
  }
  const sharpness = clamp(options.sharpness, 0, 100) / 100 * 1.6;
  if (sharpness > 0) {
    const blurred = blur(rgb, width, height);
    for (let i = 0; i < rgb.length; i++) rgb[i] = byte(rgb[i] + (rgb[i] - blurred[i]) * sharpness);
  }
  if (options.printStyle === "retro") {
    const tint = [.45, .6, .3];
    for (let i = 0; i < rgb.length; i += 3) {
      const y = luminance(rgb, i) / 255;
      for (let c = 0; c < 3; c++) rgb[i + c] = byte(255 * (y < .5 ? 2 * y * tint[c] : 1 - 2 * (1 - y) * (1 - tint[c])));
    }
  }
  // Monotonic curve: preserve relative shadow detail and leave whites intact.
  const liftStrength = clamp(options.shadowLift, 0, 100) * 1.1;
  const values = new Float64Array(width * height);
  for (let p = 0; p < values.length; p++) {
    if (liftStrength > 0) {
      const lift = liftStrength * (1 - luminance(rgb, p * 3) / 255) ** 2;
      for (let c = 0; c < 3; c++) rgb[p * 3 + c] = byte(rgb[p * 3 + c] + lift);
    }
    values[p] = luminance(rgb, p * 3);
  }
  const output = new Uint8ClampedArray(rgba.length);
  const density = clamp(options.dotDensity, .5, 1.5);
  const threshold = clamp(132 + (density - 1) * 44, 96, 176);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function spread(x: number, y: number, error: number) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const i = y * width + x;
      values[i] = clamp(values[i] + error / 8, 0, 255);
    }
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const black = values[i] < (photo ? threshold : clamp(32 + bayer[(y & 3) * 4 + (x & 3)] * 13 + (density - 1) * 80, 0, 255));
    const value = black ? 0 : 255;
    output.fill(value, i * 4, i * 4 + 3);
    output[i * 4 + 3] = 255;
    if (photo) {
      const error = values[i] - value;
      spread(x + 1, y, error); spread(x + 2, y, error);
      spread(x - 1, y + 1, error); spread(x, y + 1, error);
      spread(x + 1, y + 1, error); spread(x, y + 2, error);
    }
  }
  return output;
}
