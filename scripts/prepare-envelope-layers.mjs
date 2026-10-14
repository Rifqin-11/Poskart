import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Keep the accepted envelope photograph registered in every layer. A different
// open-envelope photograph must never be cross-faded over the closed silhouette.
const assets = fileURLToPath(new URL("../public/landing/", import.meta.url));
const width = 1145;
const height = 1374;
const { data: original } = await sharp(`${assets}gallery-envelope-closed.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const outline = "M 51 285 L 76 280 L 182 285 L 307 282 L 449 284 L 590 281 L 723 284 L 879 280 L 1007 284 L 1094 280 L 1100 297 L 1093 359 L 1098 416 L 1094 488 L 1098 562 L 1093 637 L 1098 711 L 1094 798 L 1098 883 L 1093 974 L 1098 1066 L 1064 1068 L 966 1065 L 849 1068 L 718 1065 L 591 1069 L 482 1065 L 366 1068 L 255 1065 L 149 1068 L 49 1064 L 46 1048 L 51 991 L 47 924 L 51 851 L 47 785 L 52 717 L 48 653 L 52 581 L 48 515 L 53 441 L 48 372 L 54 321 Z";
const flapOutline = "M 51 285 L 76 280 L 182 285 L 307 282 L 449 284 L 590 281 L 723 284 L 879 280 L 1007 284 L 1094 280 L 1097 298 L 1083 338 L 1054 376 L 1013 403 L 977 438 L 932 468 L 892 503 L 849 535 L 807 568 L 770 598 L 729 631 L 689 661 L 649 697 L 612 727 L 573 750 L 536 726 L 497 698 L 456 662 L 416 631 L 372 600 L 337 567 L 296 537 L 256 503 L 212 473 L 179 439 L 140 410 L 106 379 L 77 345 L 61 314 Z";
const pocketCutout = "M 48 280 L 1100 280 L 1100 318 L 1081 350 L 1049 387 L 1007 414 L 970 447 L 926 479 L 885 512 L 842 544 L 800 578 L 761 609 L 721 642 L 680 672 L 640 708 L 602 738 L 573 763 L 538 738 L 490 709 L 447 672 L 407 641 L 364 610 L 328 577 L 288 547 L 247 513 L 204 482 L 170 448 L 132 419 L 98 388 L 69 353 L 48 321 Z";
function mask(paths) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`);
}
function withoutWax(donorOffset) {
  const pixels = Buffer.from(original);
  for (let y = 590; y < 882; y++) {
    for (let x = 431; x < 717; x++) {
      const distance = Math.hypot((x - 574) / 139, (y - 741) / 139);
      const blend = Math.max(0, Math.min(1, (1 - distance) / .18));
      if (!blend) continue;
      const index = (y * width + x) * 4;
      const donor = ((y + donorOffset) * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) pixels[index + channel] = Math.round(original[index + channel] * (1 - blend) + original[donor + channel] * blend);
    }
  }
  return pixels;
}
async function layer(pixels, alpha, name, crop) {
  let image = sharp(pixels, { raw: { width, height, channels: 4 } }).composite([{ input: alpha, blend: "dest-in" }]);
  // Extract after applying the full-canvas mask, not before compositing it.
  const masked = await image.png().toBuffer();
  image = sharp(masked);
  if (crop) image = image.extract(crop);
  await image.webp({ quality: 95, alphaQuality: 100 }).toFile(`${assets}${name}.webp`);
}
const pocketMask = mask(`<defs><mask id="pocket"><path d="${outline}" fill="white"/><path d="${pocketCutout}" fill="black"/></mask></defs><rect width="${width}" height="${height}" fill="white" mask="url(#pocket)"/>`);
await layer(withoutWax(150), pocketMask, "gallery-envelope-pocket");
await layer(withoutWax(-210), mask(`<path d="${flapOutline}" fill="white"/>`), "gallery-envelope-flap", { left: 48, top: 282, width: 1052, height: 470 });

// A two-sided hinged sheet needs the reverse-face silhouette vertically
// mirrored; otherwise its tip, instead of its wide edge, meets the fold.
await sharp(`${assets}gallery-envelope-flap.webp`).flip().webp({ quality: 95, alphaQuality: 100 }).toFile(`${assets}gallery-envelope-flap-inside.webp`);

// The inside is registered to the same outer contour. It is behind both the
// photograph and the front pocket, so only the real opening remains visible.
const inside = await sharp(`${assets}gallery-envelope-open.webp`).extract({ left: 32, top: 600, width: 956, height: 794 }).resize(1052, 786).modulate({ brightness: .95 }).png().toBuffer();
const backing = await sharp({ create: { width, height, channels: 4, background: "transparent" } }).composite([{ input: inside, left: 48, top: 282 }]).raw().toBuffer();
await layer(backing, mask(`<path d="${outline}" fill="white"/>`), "gallery-envelope-inside");

// The seal is now an actual independent asset, not a transparent button over
// wax baked into three photos. Saturation separates wax from cream paper.
const sealWidth = 220;
const sealHeight = 220;
const wax = Buffer.alloc(sealWidth * sealHeight * 4);
for (let y = 0; y < sealHeight; y++) {
  for (let x = 0; x < sealWidth; x++) {
    const source = ((y + 618) * width + x + 461) * 4;
    const target = (y * sealWidth + x) * 4;
    original.copy(wax, target, source, source + 3);
    wax[target + 3] = Math.round(255 * Math.max(0, Math.min(1, (original[source] - Math.max(original[source + 1], original[source + 2]) - 12) / 12)));
  }
}
await sharp(wax, { raw: { width: sealWidth, height: sealHeight, channels: 4 } }).webp({ quality: 95, alphaQuality: 100 }).toFile(`${assets}gallery-envelope-wax.webp`);
console.log("Prepared five registered transparent envelope layers.");
