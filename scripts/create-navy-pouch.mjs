// Builds the navy POSKART unboxing pouch from the photographed silver pouch.
// The original luminance is kept so crinkles and reflections stay realistic.
// Outputs share one canvas so every layer registers exactly during the tear.
import sharp from "sharp";

const source = "public/landing/gallery-pouch.png";
const out = "public/landing";
const meta = await sharp(source).metadata();
const { data, info } = await sharp(source)
  .extract({ left: Math.round(meta.width * .11), top: Math.round(meta.height * .025), width: Math.round(meta.width * .785), height: Math.round(meta.height * .935) })
  .resize({ width: 850 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const noise = x => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
// Irregular diagonal tear path shared by the cut, the torn edge, and the reveal.
const seam = x => h * (.235 + .05 * x / w) + Math.sin(x * .045) * 3 + (noise(Math.floor(x / 5)) - .5) * 5;

// 0. The source photo sits on white; flood-fill near-white pixels from the
// canvas border to make the background transparent.
const bg = new Uint8Array(w * h);
const isWhite = p => { const i = p * 4; return Math.min(data[i], data[i + 1], data[i + 2]) > 236 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) < 14; };
const queue = [];
for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
while (queue.length) {
  const p = queue.pop();
  if (bg[p] || !isWhite(p)) continue;
  bg[p] = 1;
  const x = p % w;
  if (x > 0) queue.push(p - 1);
  if (x < w - 1) queue.push(p + 1);
  if (p >= w) queue.push(p - w);
  if (p < w * (h - 1)) queue.push(p + w);
}
for (let p = 0; p < w * h; p++) if (bg[p]) data[p * 4 + 3] = 0;
// Soften the silhouette by one pixel so it does not look cut out.
for (let p = w; p < w * (h - 1); p++) if (!bg[p] && (bg[p - 1] || bg[p + 1] || bg[p - w] || bg[p + w])) data[p * 4 + 3] = 150;

// 1. Recolor silver to deep navy, keeping highlights as soft specular light.
const navy = Buffer.from(data);
const dark = [7, 18, 48], mid = [28, 58, 132], light = [190, 208, 245];
for (let i = 0; i < navy.length; i += 4) {
  const l = (data[i] * .3 + data[i + 1] * .59 + data[i + 2] * .11) / 255;
  const t = clamp((l - .3) / .7) ** 1.5;
  const spec = clamp((l - .86) / .14) ** 1.6 * .6;
  for (let c = 0; c < 3; c++) {
    const base = dark[c] + (mid[c] - dark[c]) * t;
    navy[i + c] = Math.round(base + (light[c] - base) * spec);
  }
}

// 2. Cut a V tear notch into the right edge at the seam start.
const notchY = seam(w - 1);
for (let y = Math.floor(notchY - 14); y <= notchY + 14; y++) {
  const depth = 22 - Math.abs(y - notchY) * 1.5;
  for (let x = w - 1; x > w - 1 - depth - 40; x--) {
    const i = (y * w + x) * 4 + 3;
    if (navy[i] > 0) { for (let k = 0; k < depth; k++) { const j = (y * w + x - k) * 4 + 3; if (j > 0) navy[j] = 0; } break; }
  }
}

// 3. Branding: real POSKART mark turned into a white print, plus wordmark.
const logo = await sharp("public/logo-mark-256.webp").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < logo.data.length; i += 4) {
  const lum = (logo.data[i] + logo.data[i + 1] + logo.data[i + 2]) / 3;
  logo.data[i + 3] = Math.round(logo.data[i + 3] * clamp((232 - lum) / 140));
  logo.data[i] = logo.data[i + 1] = logo.data[i + 2] = 248;
}
const logoSize = Math.round(w * .34);
const logoPng = await sharp(logo.data, { raw: logo.info }).resize(logoSize).png().toBuffer();
const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <text x="${w / 2}" y="${h * .655}" text-anchor="middle" font-family="${font}" font-weight="800" font-size="${w * .088}" letter-spacing="${w * .012}" fill="#f8fafc">POSKART</text>
  <rect x="${w * .42}" y="${h * .675}" width="${w * .16}" height="2" fill="#f8fafc" opacity=".55"/>
  <text x="${w / 2}" y="${h * .712}" text-anchor="middle" font-family="${font}" font-weight="600" font-size="${w * .024}" letter-spacing="${w * .008}" fill="#dbe4f7" opacity=".85">RECEIPT PHOTOBOOTH</text>
  <text x="${w / 2}" y="${h * .9}" text-anchor="middle" font-family="${font}" font-weight="500" font-size="${w * .019}" letter-spacing="${w * .006}" fill="#dbe4f7" opacity=".5">YOUR MOMENTS · SEALED WITH CARE</text>
</svg>`);

// Embossed seal groove along the seam: shadow line + highlight line.
const groove = (dy, color, op) => `<path d="M ${Array.from({ length: 86 }, (_, k) => { const x = k * w / 85; return `${x.toFixed(1)} ${(seam(x) + dy).toFixed(1)}`; }).join(" L ")}" fill="none" stroke="${color}" stroke-width="1.4" opacity="${op}"/>`;
const emboss = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${groove(0, "#020617", .55)}${groove(1.6, "#9fb6e8", .35)}</svg>`);

const printed = await sharp(navy, { raw: info })
  .composite([
    { input: emboss, blend: "over" },
    { input: logoPng, top: Math.round(h * .35), left: Math.round((w - logoSize) / 2) },
    { input: text },
  ])
  // Keep the pouch silhouette: printed layers must not spill past the plastic.
  .raw().toBuffer();
for (let i = 3; i < printed.length; i += 4) printed[i] = Math.min(printed[i], navy[i]);

// 4. Torn edge texture: the white inner foil layer exposed along a rip.
function tornEdge(base, side) {
  const result = Buffer.from(base);
  for (let x = 0; x < w; x++) {
    const s = seam(x);
    const band = 2.5 + noise(x * .7) * 4 + (noise(Math.floor(x / 3)) > .85 ? 3 : 0);
    for (let k = 0; k < band + 9; k++) {
      const y = Math.round(side === "body" ? s + k : s - 1 - k);
      if (y < 0 || y >= h) continue;
      const i = (y * w + x) * 4;
      if (result[i + 3] === 0) continue;
      if (k < band) {
        // Inner foil: bright, slightly blue-grey, with fibre variation.
        const v = 215 + noise(x * 3.1 + k) * 35;
        result[i] = v * .93; result[i + 1] = v * .96; result[i + 2] = v;
      } else {
        // Soft shadow just past the foil where the film lifts.
        const a = (1 - (k - band) / 9) * .35;
        for (let c = 0; c < 3; c++) result[i + c] = Math.round(result[i + c] * (1 - a));
      }
    }
  }
  return result;
}

// 5. Split into top seal and body along the same seam.
const top = tornEdge(printed, "top");
const body = tornEdge(printed, "body");
for (let x = 0; x < w; x++) {
  const s = seam(x);
  for (let y = 0; y < h; y++) {
    const i = (y * w + x) * 4 + 3;
    if (y >= s) top[i] = 0; else body[i] = 0;
  }
}

// 6. Progressive tear strip shown during the swipe (revealed right to left).
const strip = Buffer.alloc(w * h * 4);
for (let x = 0; x < w; x++) {
  const s = seam(x);
  const band = 2 + noise(x * .7) * 3.5;
  for (let k = -3; k < band + 6; k++) {
    const y = Math.round(s + k);
    if (y < 0 || y >= h) continue;
    const i = (y * w + x) * 4, src = (y * w + x) * 4 + 3;
    if (printed[src] === 0) continue;
    if (k < 0) { strip[i + 3] = 150; } // dark gap of the opening rip
    else if (k < band) { const v = 220 + noise(x * 2.3 + k) * 35; strip[i] = v * .93; strip[i + 1] = v * .96; strip[i + 2] = v; strip[i + 3] = 255; }
    else { strip[i + 3] = Math.round((1 - (k - band) / 6) * 90); }
  }
}

const webp = buf => sharp(buf, { raw: info }).webp({ quality: 90, alphaQuality: 100 });
await Promise.all([
  webp(printed).toFile(`${out}/gallery-pouch-navy.webp`),
  webp(top).toFile(`${out}/gallery-pouch-navy-top.webp`),
  webp(body).toFile(`${out}/gallery-pouch-navy-body.webp`),
  webp(strip).toFile(`${out}/gallery-pouch-navy-tear.webp`),
  sharp(printed, { raw: info }).png().toFile("/var/folders/xw/ctjq4gxn6nd775j60744sg640000gn/T/opencode/navy-pouch-preview.png"),
]);
console.log(`Created navy pouch layers (${w}x${h}).`);
