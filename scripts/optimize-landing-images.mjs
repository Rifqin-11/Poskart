import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), "public");
const outDir = path.join(root, "landing");
await mkdir(outDir, { recursive: true });

const jobs = [
  { src: "Admin/Dashboard.png", out: "dashboard" },
  { src: "Admin/Frames.png", out: "frames" },
  { src: "Admin/Devices.png", out: "devices" },
  { src: "Admin/Settings.png", out: "settings" },
  { src: "Admin/Showcase.png", out: "showcase" },
  // Scrollytelling section assets.
  { src: "Admin/DevicesPair.png", out: "pairing" },
  { src: "Admin/Queue.png", out: "queue" },
  { src: "App/Camera.png", out: "booth-camera" },
  { src: "App/Settings.png", out: "booth-settings" },
];

for (const job of jobs) {
  const target = path.join(outDir, `${job.out}.webp`);
  const info = await sharp(path.join(root, job.src))
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 76, effort: 5 })
    .toFile(target);
  console.log(`${job.out}.webp  ${Math.round(info.size / 1024)} KB  ${info.width}x${info.height}`);
}

// The original logo is 2000x2000 (~216 KB) but renders at 28-40px in the UI.
for (const [name, width] of [
  ["logo-mark.webp", 128],
  ["logo-mark-256.webp", 256],
]) {
  const info = await sharp(path.join(root, "Logo Poskart.png"))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 })
    .toFile(path.join(root, name));
  console.log(`${name}  ${Math.round(info.size / 1024)} KB  ${info.width}x${info.height}`);
}
