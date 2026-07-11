import { createHash, createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// Disable sharp cache to prevent memory leaks/OOM in constrained environments (like Railway)
sharp.cache(false);

const FRAME_COUNT = Number.parseInt(process.env.LIVE_PHOTO_FRAME_COUNT ?? "36", 10);
const TARGET_WIDTH = Number.parseInt(process.env.LIVE_PHOTO_TARGET_WIDTH ?? "600", 10);
const FRAME_DURATION_MS = Number.parseInt(
  process.env.LIVE_PHOTO_FRAME_DURATION_MS ?? "83",
  10,
);
const POLL_INTERVAL_MS = Number.parseInt(
  process.env.LIVE_PHOTO_WORKER_POLL_MS ?? "3000",
  10,
);
const MAX_ATTEMPTS = Number.parseInt(
  process.env.LIVE_PHOTO_WORKER_MAX_ATTEMPTS ?? "3",
  10,
);
const LEASE_TIMEOUT_SECONDS = Number.parseInt(
  process.env.LIVE_PHOTO_WORKER_LEASE_TIMEOUT_SECONDS ?? "900",
  10,
);
const FETCH_TIMEOUT_MS = Number.parseInt(
  process.env.LIVE_PHOTO_FETCH_TIMEOUT_MS ?? "30000",
  10,
);
const MAX_SOURCE_BYTES = Number.parseInt(
  process.env.LIVE_PHOTO_MAX_SOURCE_BYTES ?? `${25 * 1024 * 1024}`,
  10,
);
const WORKER_ID =
  process.env.RAILWAY_REPLICA_ID ??
  process.env.RAILWAY_DEPLOYMENT_ID ??
  `${hostname()}-${process.pid}`;

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
const imageKitPublicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "";
const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? "";
const imageKitUrlEndpoint = normalizeImageKitEndpoint(
  process.env.IMAGEKIT_URL_ENDPOINT,
);
const supabaseOrigin = new URL(supabaseUrl).origin;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("[live-photo-worker] started");

while (true) {
  try {
    const job = await claimNextJob();
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    await processJob(job);
  } catch (error) {
    console.error("[live-photo-worker] loop error", error);
    await sleep(POLL_INTERVAL_MS);
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function claimNextJob() {
  const { data, error: claimError } = await supabase.rpc(
    "claim_live_photo_render_job",
    {
      max_attempts: MAX_ATTEMPTS,
      lease_timeout_seconds: LEASE_TIMEOUT_SECONDS,
      worker_identifier: WORKER_ID,
    },
  );
  if (claimError) throw claimError;
  return data?.[0] ?? null;
}

async function processJob(job) {
  const workDir = await mkdtemp(path.join(tmpdir(), "poskart-live-photo-"));
  console.log(`[live-photo-worker] processing ${job.session_id}`);

  try {
    const sourceAssets = normalizeSourceAssets(job.source_assets);
    if (sourceAssets.length === 0) {
      throw new Error("No Live Photo source assets available.");
    }

    const layout = normalizeLayout(job.template);
    const sourceFrames = await prepareSourceFrames(sourceAssets, workDir);
    const renderedFramePaths = await renderOutputFrames({
      layout,
      sourceFrames,
      workDir,
    });
    const outputPath = path.join(workDir, "framed-live-photo.mp4");
    await encodeMp4(renderedFramePaths, outputPath);
    const upload = await uploadToGalleryProvider({
      filePath: outputPath,
      organizationId: job.organization_id,
      sessionId: job.session_id,
    });

    await saveOutput(job, upload);
    console.log(`[live-photo-worker] completed ${job.session_id}`);
  } catch (error) {
    await markFailed(job, error);
    console.error(`[live-photo-worker] failed ${job.session_id}`, error);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function normalizeSourceAssets(value) {
  const assets = Array.isArray(value) ? value : [];
  return assets
    .map((asset) => ({
      slotIndex: Number.isInteger(asset?.slotIndex) ? asset.slotIndex : -1,
      secureUrl: typeof asset?.secureUrl === "string" ? asset.secureUrl : "",
      publicId: typeof asset?.publicId === "string" ? asset.publicId : "",
      format: typeof asset?.format === "string" ? asset.format.toLowerCase() : "",
      bytes: Number.isFinite(asset?.bytes) ? asset.bytes : null,
      mirrorHorizontal: asset?.mirrorHorizontal === true,
    }))
    .filter(
      (asset) =>
        asset.slotIndex >= 0 &&
        isAllowedGallerySourceUrl(asset.secureUrl) &&
        (asset.bytes === null || asset.bytes <= MAX_SOURCE_BYTES),
    )
    .sort((left, right) => left.slotIndex - right.slotIndex);
}

function normalizeLayout(template) {
  const frameLayout = template?.frameLayout;
  if (frameLayout?.canvas) return frameLayout;

  const photoCount = Math.max(
    1,
    Math.min(12, Number.parseInt(`${template?.photoCount ?? 3}`, 10) || 3),
  );
  const canvas = { width: 600, height: 900, backgroundColor: "#ffffff" };
  const gap = 24;
  const outer = 32;
  const slotHeight = Math.floor((canvas.height - outer * 2 - gap * (photoCount - 1)) / photoCount);
  const nodes = Array.from({ length: photoCount }, (_, index) => ({
    id: `photo-slot-${index + 1}`,
    type: "photo-slot",
    x: outer,
    y: outer + index * (slotHeight + gap),
    width: canvas.width - outer * 2,
    height: slotHeight,
    rotation: 0,
    opacity: 1,
    zIndex: index,
    props: { label: `Photo ${index + 1}`, radius: 10 },
  }));

  return { version: 1, canvas, nodes };
}

async function prepareSourceFrames(sourceAssets, workDir) {
  const sourceFrames = new Map();

  for (const asset of sourceAssets) {
    const inputExtension = /^[a-z0-9]{2,5}$/.test(asset.format)
      ? asset.format
      : "media";
    const inputPath = path.join(
      workDir,
      `source-${asset.slotIndex}.${inputExtension}`,
    );
    const outputDir = path.join(workDir, `source-${asset.slotIndex}-frames`);
    await downloadToFile(asset.secureUrl, inputPath);
    await mkdir(outputDir, { recursive: true });
    const frames = await extractSourceFrames(
      inputPath,
      outputDir,
      asset.mirrorHorizontal,
    );
    if (frames.length > 0) {
      sourceFrames.set(asset.slotIndex, frames);
    }
  }

  if (sourceFrames.size === 0) {
    throw new Error("Unable to extract any Live Photo source frames.");
  }
  return sourceFrames;
}

async function downloadToFile(url, filePath) {
  const bytes = await fetchBuffer(url, `source asset ${url}`);
  await writeFile(filePath, bytes);
}

async function extractSourceFrames(inputPath, outputDir, mirrorHorizontal) {
  const pattern = path.join(outputDir, "frame-%03d.png");
  try {
    const sourceFrameRate = (FRAME_COUNT / 3).toFixed(3);
    const videoFilter = [mirrorHorizontal ? "hflip" : null, `fps=${sourceFrameRate}`]
      .filter(Boolean)
      .join(",");
    await run("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      videoFilter,
      "-frames:v",
      `${FRAME_COUNT}`,
      pattern,
    ]);
  } catch (error) {
    if (!isImagePath(inputPath)) {
      throw error;
    }
    const fallbackPath = path.join(outputDir, "frame-001.png");
    await sharp(inputPath, { animated: false }).png().toFile(fallbackPath);
  }
  const files = await readdir(outputDir);
  return files
    .filter((file) => file.endsWith(".png"))
    .sort()
    .map((file) => path.join(outputDir, file));
}

async function renderOutputFrames({ layout, sourceFrames, workDir }) {
  const canvas = layout.canvas ?? {};
  const canvasWidth = Math.max(1, Number(canvas.width ?? 600));
  const canvasHeight = Math.max(1, Number(canvas.height ?? 900));
  const scale = TARGET_WIDTH / canvasWidth;
  const outputWidth = Math.round(canvasWidth * scale);
  const outputHeight = Math.round(canvasHeight * scale);
  const backgroundColor = readColor(canvas.backgroundColor, "#ffffff");
  const nodes = normalizeNodes(layout.nodes ?? layout.elements ?? []);
  const outputPaths = [];
  const imageCache = new Map();

  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const composites = [];
    for (const node of nodes) {
      const overlay = await renderNodeOverlay({
        node,
        frameIndex,
        sourceFrames,
        scale,
        imageCache,
      });
      if (overlay) composites.push(overlay);
    }

    const outputPath = path.join(
      workDir,
      `rendered-${String(frameIndex + 1).padStart(3, "0")}.png`,
    );
    await sharp({
      create: {
        width: outputWidth,
        height: outputHeight,
        channels: 4,
        background: backgroundColor,
      },
    })
      .composite(composites)
      .png()
      .toFile(outputPath);
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

function normalizeNodes(nodes) {
  return (Array.isArray(nodes) ? nodes : [])
    .filter((node) => node && typeof node === "object")
    .map((node, index) => ({
      ...node,
      zIndex: Number.isFinite(node.zIndex) ? node.zIndex : index,
    }))
    .sort((left, right) => left.zIndex - right.zIndex);
}

async function renderNodeOverlay({ node, frameIndex, sourceFrames, scale, imageCache }) {
  const left = Math.round(Number(node.x ?? 0) * scale);
  const top = Math.round(Number(node.y ?? 0) * scale);
  const width = Math.max(1, Math.round(Number(node.width ?? 1) * scale));
  const height = Math.max(1, Math.round(Number(node.height ?? 1) * scale));
  const opacity = Math.max(0, Math.min(1, Number(readProp(node, "opacity", node.opacity ?? 1))));

  if (node.type === "photo-slot") {
    const slotIndex = getPhotoSlotIndex(node);
    const frames = sourceFrames.get(slotIndex);
    if (!frames?.length) return null;
    const framePath = selectSourceFrame(frames, frameIndex, FRAME_COUNT);
    const input = await sharp(framePath)
      .resize(width, height, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
    return { input, left, top, opacity };
  }

  if (node.type === "background" || node.type === "image") {
    const src = readImageSource(node);
    if (src) {
      const source = await loadImageBuffer(src, imageCache);
      const colorKey = normalizeColorKey(readProp(node, "colorKey", null));
      const image = sharp(source).resize(width, height, {
        fit: "cover",
        position: "center",
      });
      const input = colorKey.enabled
        ? await renderColorKeyImage(image, colorKey)
        : await image.png().toBuffer();
      return { input, left, top, opacity };
    }

    const color = readColor(readProp(node, "background", readProp(node, "color", null)), "#ffffff");
    const input = await sharp({
      create: { width, height, channels: 4, background: color },
    })
      .png()
      .toBuffer();
    return { input, left, top, opacity };
  }

  if (node.type === "border") {
    const strokeWidth = Math.max(1, Number(readProp(node, "strokeWidth", 2)) * scale);
    const color = readColor(readProp(node, "color", readProp(node, "borderColor", null)), "#18181b");
    const input = Buffer.from(
      `<svg width="${width}" height="${height}"><rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${width - strokeWidth}" height="${height - strokeWidth}" fill="none" stroke="${escapeXml(color)}" stroke-width="${strokeWidth}"/></svg>`,
    );
    return { input, left, top, opacity };
  }

  if (node.type === "text" || node.type === "date-stamp") {
    const text =
      node.type === "date-stamp"
        ? new Date().toISOString().slice(0, 10)
        : String(readProp(node, "text", ""));
    if (!text) return null;
    const fontSize = Math.max(8, Number(readProp(node, "fontSize", 20)) * scale);
    const color = readColor(readProp(node, "color", null), "#18181b");
    const weight = readProp(node, "fontWeight", "") === "bold" ? "700" : "400";
    const input = Buffer.from(
      `<svg width="${width}" height="${height}"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${escapeXml(color)}">${escapeXml(text)}</text></svg>`,
    );
    return { input, left, top, opacity };
  }

  return null;
}

function selectSourceFrame(frames, frameIndex, outputFrameCount) {
  if (frames.length <= 1 || outputFrameCount <= 1) return frames[0];
  const normalized = frameIndex / (outputFrameCount - 1);
  const sourceIndex = Math.min(
    frames.length - 1,
    Math.round(normalized * (frames.length - 1)),
  );
  return frames[sourceIndex];
}

function readProp(node, key, fallback) {
  if (node && Object.prototype.hasOwnProperty.call(node, key)) return node[key];
  if (node?.props && Object.prototype.hasOwnProperty.call(node.props, key)) {
    return node.props[key];
  }
  return fallback;
}

function readImageSource(node) {
  const value =
    readProp(node, "src", null) ??
    readProp(node, "url", null) ??
    readProp(node, "imageUrl", null);
  return typeof value === "string" && value.startsWith("http") ? value : null;
}

async function loadImageBuffer(src, cache) {
  if (cache.has(src)) return cache.get(src);
  if (!isAllowedImageNodeUrl(src)) {
    throw new Error(`Image node URL is not allowed: ${src}`);
  }
  const buffer = await fetchBuffer(src, `image node ${src}`);
  cache.set(src, buffer);
  return buffer;
}

function getPhotoSlotIndex(node) {
  const label = String(readProp(node, "label", ""));
  const match = /Photo\s+(\d+)/i.exec(label);
  if (match) return Math.max(0, Number.parseInt(match[1], 10) - 1);
  const idMatch = /(\d+)/.exec(String(node.id ?? ""));
  if (idMatch) return Math.max(0, Number.parseInt(idMatch[1], 10) - 1);
  return 0;
}

function readColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    const red = Number.parseInt(trimmed.slice(1, 3), 16);
    const green = Number.parseInt(trimmed.slice(3, 5), 16);
    const blue = Number.parseInt(trimmed.slice(5, 7), 16);
    const alpha = Number.parseInt(trimmed.slice(7, 9), 16) / 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
  }
  return fallback;
}

async function renderColorKeyImage(image, colorKey) {
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  applyColorKeyToRawImage(data, info.width, info.height, colorKey);
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
}

function normalizeColorKey(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    enabled: Boolean(source.enabled),
    color: normalizeHexColor(source.color),
    tolerance: clampNumber(source.tolerance, 0, 255, 32),
    softness: clampNumber(source.softness, 0, 100, 12),
    smoothness: clampNumber(source.smoothness, 0, 20, 2),
  };
}

function normalizeHexColor(value, fallback = "#00ff00") {
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

function clampNumber(value, min, max, fallback) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function parseHexColor(value) {
  const hex = normalizeHexColor(value).slice(1);
  const int = Number.parseInt(hex, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function applyColorKeyToRawImage(data, width, height, settings) {
  if (!settings.enabled) return;
  const key = parseHexColor(settings.color);
  if (!key) return;

  const tolerance = clampNumber(settings.tolerance, 0, 255, 32);
  const softness = clampNumber(settings.softness, 0, 100, 12);
  const smoothness = clampNumber(settings.smoothness, 0, 20, 2);
  const keyHsv = rgbToHsv(key.r, key.g, key.b);
  const featherStart = Math.max(0, tolerance - softness);
  const featherRange = Math.max(1, tolerance - featherStart);

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 255;
    const distance = Math.sqrt(
      (red - key.r) ** 2 + (green - key.g) ** 2 + (blue - key.b) ** 2,
    );

    if (!isLikelyColorKeyPixel(red, green, blue, keyHsv, tolerance, softness)) {
      continue;
    }

    if (distance <= featherStart) {
      data[index + 3] = 0;
    } else if (distance <= tolerance) {
      data[index + 3] = Math.round(alpha * ((distance - featherStart) / featherRange));
    }
  }

  if (smoothness > 0) {
    smoothAlphaChannel(data, width, height, smoothness);
  }
}

function isLikelyColorKeyPixel(red, green, blue, keyHsv, tolerance, softness) {
  if (keyHsv.s < 0.12) return true;

  const pixelHsv = rgbToHsv(red, green, blue);
  if (pixelHsv.s < Math.max(0.06, keyHsv.s * 0.2)) return false;

  const hueDelta = Math.min(
    Math.abs(pixelHsv.h - keyHsv.h),
    360 - Math.abs(pixelHsv.h - keyHsv.h),
  );
  const hueLimit = Math.min(72, Math.max(8, tolerance * 0.35 + softness * 0.1));
  return hueDelta <= hueLimit;
}

function rgbToHsv(red, green, blue) {
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

function smoothAlphaChannel(data, width, height, radius) {
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

async function encodeMp4(framePaths, outputPath) {
  const frameRate = (1000 / FRAME_DURATION_MS).toFixed(3);
  const tempDir = path.dirname(framePaths[0]);
  const inputPattern = path.join(tempDir, "rendered-%03d.png");

  await run("ffmpeg", [
    "-y",
    "-framerate",
    frameRate,
    "-i",
    inputPattern,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    outputPath,
  ]);
}

async function uploadToGalleryProvider({ filePath, organizationId, sessionId }) {
  const config = await resolveGalleryStorageConfig();
  if (config.provider === "imagekit") {
    return uploadToImageKit({ filePath, organizationId, sessionId, config });
  }

  return uploadToCloudinary({ filePath, organizationId, sessionId, config });
}

async function uploadToCloudinary({ filePath, organizationId, sessionId, config }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = ["poskart", safeSegment(organizationId), safeSegment(sessionId)].join("/");
  const publicId = "framed-live-photo";
  const signaturePayload = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(`${signaturePayload}${config.apiSecret}`)
    .digest("hex");
  const bytes = await readFile(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: "video/mp4" }), "framed-live-photo.mp4");
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", `${timestamp}`);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
    { method: "POST", body: formData },
  );
  const result = await response.json();
  if (!response.ok || !result.secure_url) {
    throw new Error(`Cloudinary upload failed: ${JSON.stringify(result)}`);
  }
  return {
    provider: "cloudinary",
    publicId: result.public_id,
    secureUrl: result.secure_url,
    width: result.width ?? null,
    height: result.height ?? null,
    bytes: result.bytes ?? null,
    format: result.format ?? "mp4",
    resourceType: "video",
  };
}

async function uploadToImageKit({ filePath, organizationId, sessionId, config }) {
  const bytes = await readFile(filePath);
  const folder = ["/poskart", safeSegment(organizationId), safeSegment(sessionId)].join("/");
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 30 * 60;
  const signature = createHmac("sha1", config.privateKey)
    .update(`${token}${expire}`)
    .digest("hex");
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: "video/mp4" }), "framed-live-photo.mp4");
  formData.append("fileName", "framed-live-photo.mp4");
  formData.append("publicKey", config.publicKey);
  formData.append("signature", signature);
  formData.append("expire", `${expire}`);
  formData.append("token", token);
  formData.append("folder", folder);
  formData.append("useUniqueFileName", "false");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });
  const result = await response.json();
  if (!response.ok || !result.url || !result.fileId) {
    throw new Error(`ImageKit upload failed: ${JSON.stringify(result)}`);
  }
  return {
    provider: "imagekit",
    publicId: result.fileId,
    secureUrl: result.url,
    width: result.width ?? null,
    height: result.height ?? null,
    bytes: result.size ?? null,
    format: "mp4",
    resourceType: "video",
  };
}

async function saveOutput(job, upload) {
  const now = new Date().toISOString();
  const { error: photoError } = await supabase.from("gallery_photos").upsert(
    {
      session_id: job.session_id,
      organization_id: job.organization_id,
      kind: "framed",
      photo_index: 1,
      storage_provider: upload.provider,
      cloudinary_public_id: upload.publicId,
      provider_public_id: upload.publicId,
      secure_url: upload.secureUrl,
      resource_type: upload.resourceType,
      width: upload.width ?? null,
      height: upload.height ?? null,
      bytes: upload.bytes ?? null,
      format: upload.format ?? "mp4",
    },
    { onConflict: "session_id,kind,photo_index" },
  );
  if (photoError) throw photoError;

  const { error: jobError } = await supabase
    .from("live_photo_render_jobs")
    .update({
      status: "succeeded",
      output_public_id: upload.publicId,
      output_secure_url: upload.secureUrl,
      output_width: upload.width ?? null,
      output_height: upload.height ?? null,
      output_bytes: upload.bytes ?? null,
      output_format: upload.format ?? "mp4",
      error_message: null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", job.id);
  if (jobError) throw jobError;
}

async function markFailed(job, error) {
  const now = new Date().toISOString();
  const attempts = job.attempts ?? 1;
  const willRetry = attempts < MAX_ATTEMPTS;
  const { error: updateError } = await supabase
    .from("live_photo_render_jobs")
    .update({
      status: willRetry ? "queued" : "failed",
      error_message: error instanceof Error ? error.message : String(error),
      updated_at: now,
      completed_at: willRetry ? null : now,
    })
    .eq("id", job.id);
  if (updateError) console.error("[live-photo-worker] failed to mark job failed", updateError);
}

function safeSegment(value) {
  return String(value).trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function fetchBuffer(url, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Unable to download ${label}: HTTP ${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
      throw new Error(`Download too large for ${label}: ${contentLength} bytes`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_BYTES) {
      throw new Error(`Download too large for ${label}: ${buffer.byteLength} bytes`);
    }
    return buffer;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Download timed out for ${label}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedCloudinaryUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "res.cloudinary.com") return false;
    if (!cloudinaryCloudName) return true;
    return url.pathname.startsWith(`/${cloudinaryCloudName}/`);
  } catch {
    return false;
  }
}

function isAllowedGallerySourceUrl(value) {
  return isAllowedCloudinaryUrl(value) || isAllowedImageKitUrl(value);
}

function isAllowedImageKitUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();
    if (!endpoint) return url.hostname.endsWith("imagekit.io");
    return url.hostname === new URL(endpoint).hostname;
  } catch {
    return false;
  }
}

function isAllowedImageNodeUrl(value) {
  return isAllowedGallerySourceUrl(value) || isAllowedSupabaseBuilderAssetUrl(value);
}

function isAllowedSupabaseBuilderAssetUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.origin !== supabaseOrigin) return false;
    return url.pathname.startsWith("/storage/v1/object/public/builder-assets/");
  } catch {
    return false;
  }
}

async function resolveGalleryStorageConfig() {
  const { data, error } = await supabase
    .from("app_configs")
    .select("gallery_storage_provider")
    .eq("id", "default")
    .maybeSingle();

  if (error && error.code !== "42703") {
    throw new Error(`Unable to load gallery storage config: ${error.message}`);
  }

  if (data?.gallery_storage_provider === "imagekit") {
    if (!imageKitPublicKey || !imageKitPrivateKey || !imageKitUrlEndpoint) {
      throw new Error("ImageKit gallery storage is not configured.");
    }
    return {
      provider: "imagekit",
      publicKey: imageKitPublicKey,
      privateKey: imageKitPrivateKey,
      urlEndpoint: imageKitUrlEndpoint,
    };
  }

  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    throw new Error("Cloudinary gallery storage is not configured.");
  }
  return {
    provider: "cloudinary",
    cloudName: cloudinaryCloudName,
    apiKey: cloudinaryApiKey,
    apiSecret: cloudinaryApiSecret,
  };
}

function normalizeImageKitEndpoint(value) {
  const endpoint = typeof value === "string" ? value.trim() : "";
  if (!endpoint) return "";
  return endpoint.replace(/\/+$/, "");
}

function isImagePath(filePath) {
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(
    path.extname(filePath).toLowerCase(),
  );
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const exitReason = code !== null ? `status code ${code}` : `signal ${signal}`;
        reject(new Error(`${command} exited with ${exitReason}: ${stderr}`));
      }
    });
  });
}
