import sharp from 'sharp';

const root = 'public/landing/hero/';
const camera = 'public/App/Camera.png';
const metadata = await sharp(root + 'camera-four-poses.png').metadata();
const half = Math.floor(metadata.width / 2);
const rowHeight = Math.floor(metadata.height / 2);
const mask = Buffer.from('<svg width="1038" height="840"><rect width="1038" height="840" rx="38" fill="white"/></svg>');
const controls = await Promise.all([
  { left: 66, top: 143, width: 112, height: 50 },
  { left: 1000, top: 153, width: 45, height: 45 },
  { left: 486, top: 888, width: 152, height: 48 },
].map(async rect => ({ input: await sharp(camera).extract(rect).png().toBuffer(), left: rect.left, top: rect.top })));
for (let pose = 0; pose < 4; pose++) {
  const photo = await sharp(root + 'camera-four-poses.png')
    .extract({ left: (pose % 2) * half, top: Math.floor(pose / 2) * rowHeight, width: half, height: rowHeight })
    .resize(1038, 840, { fit: 'cover', position: 'attention' })
    .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  await sharp(camera).composite([{ input: photo, left: 42, top: 120 }, ...controls])
    .webp({ quality: 88 }).toFile(root + `booth-camera-sequence${pose + 1}.webp`);
}
console.log('Created four camera previews with different poses.');
