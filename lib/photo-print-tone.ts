const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const amount = (v = 0) => Number.isFinite(v) ? clamp(v, 0, 100) / 100 : 0;

/** Port of the kiosk's manual luminance pipeline. Never touches source RGBA. */
export function photoPrintTone(input: Float64Array, width: number, height: number,
  darkSmoothing = 0, localContrast = 0, backgroundLift = 0, personMask?: Float32Array,
): Float64Array {
  const a = amount(darkSmoothing), b = amount(localContrast), c = personMask ? amount(backgroundLift) : 0;
  let values = input.slice();
  if (personMask && personMask.length !== values.length) throw new Error("Invalid person mask");
  if (c > 0) for (let i = 0; i < values.length; i++) {
    const p = clamp(personMask![i], 0, 1);
    values[i] += (255 - values[i]) * c * (1 - p * p * (3 - 2 * p));
  }
  if (a > 0) {
    const source = values;
    values = Float64Array.from(source, (value, i) => {
      const x = i % width, y = Math.floor(i / width);
      let sum = 0, count = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const sx = x + dx, sy = y + dy;
        if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        const v = source[sy * width + sx];
        if (Math.abs(v - value) <= 32) { sum += v; count++; }
      }
      const smooth = value + ((count === 0 ? value : sum / count) - value) * a * clamp(1 - value / 160, 0, 1);
      return smooth + 112 * a * (1 - smooth / 255) ** 2;
    });
  }
  if (b === 0) return values;
  const tile = 64, nx = Math.ceil(width / tile), ny = Math.ceil(height / tile);
  const maps: Float64Array[] = [];
  for (let ty = 0; ty < ny; ty++) for (let tx = 0; tx < nx; tx++) {
    const histogram = new Int32Array(256);
    let count = 0;
    for (let y = ty * tile; y < Math.min(height, (ty + 1) * tile); y++) {
      for (let x = tx * tile; x < Math.min(width, (tx + 1) * tile); x++) {
        histogram[clamp(Math.round(values[y * width + x]), 0, 255)]++; count++;
      }
    }
    const limit = Math.max(1, Math.round(count / 256 * (1 + 2 * b)));
    let excess = 0;
    for (let i = 0; i < 256; i++) if (histogram[i] > limit) { excess += histogram[i] - limit; histogram[i] = limit; }
    const each = Math.floor(excess / 256), remainder = excess % 256;
    let sum = 0;
    maps.push(Float64Array.from(histogram, (v, i) => {
      sum += v + each + (i < remainder ? 1 : 0); return sum * 255 / count;
    }));
  }
  return Float64Array.from(values, (value, i) => {
    const fx = (i % width + .5) / tile - .5, fy = (Math.floor(i / width) + .5) / tile - .5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), dx = fx - x0, dy = fy - y0;
    const bin = clamp(Math.round(value), 0, 255);
    const at = (x: number, y: number) => maps[clamp(y, 0, ny - 1) * nx + clamp(x, 0, nx - 1)][bin];
    const mapped = (at(x0, y0) * (1 - dx) + at(x0 + 1, y0) * dx) * (1 - dy) +
      (at(x0, y0 + 1) * (1 - dx) + at(x0 + 1, y0 + 1) * dx) * dy;
    return value + (mapped - value) * b * clamp(value / 96, 0, 1);
  });
}
