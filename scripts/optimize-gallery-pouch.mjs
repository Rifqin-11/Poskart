import sharp from 'sharp';
const source = 'public/landing/gallery-pouch.png';
const meta = await sharp(source).metadata();
const { data, info } = await sharp(source)
  .extract({ left: Math.round(meta.width * .11), top: Math.round(meta.height * .025), width: Math.round(meta.width * .785), height: Math.round(meta.height * .935) })
  .resize({ width: 850 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// The top and body share one irregular cut, so they fit together exactly.
// Matching transparent canvases preserve registration throughout the peel.
const top = Buffer.from(data);
const body = Buffer.from(data);
for (let x = 0; x < info.width; x++) {
  const tooth = (x % 18) / 18;
  const seam = Math.round(info.height * (.23 + .06 * x / info.width) + (1 - Math.abs(tooth * 2 - 1)) * 6 + Math.sin(x * .14) * 1.5);
  for (let y = 0; y < info.height; y++) {
    const i = (y * info.width + x) * 4 + 3;
    if (y >= seam) top[i] = 0;
    else body[i] = 0;
  }
}
await Promise.all([
  sharp(data, { raw: info }).webp({ quality: 90 }).toFile('public/landing/gallery-pouch.webp'),
  sharp(top, { raw: info }).webp({ quality: 90, alphaQuality: 100 }).toFile('public/landing/gallery-pouch-torn-top.webp'),
  sharp(body, { raw: info }).webp({ quality: 90, alphaQuality: 100 }).toFile('public/landing/gallery-pouch-torn-body.webp'),
]);
console.log('Created intact pouch, detachable top seal, and torn pouch body.');
