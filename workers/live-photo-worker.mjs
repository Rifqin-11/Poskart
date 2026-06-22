import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const FRAME_COUNT = Number.parseInt(process.env.LIVE_PHOTO_FRAME_COUNT ?? "10", 10);
const TARGET_WIDTH = Number.parseInt(process.env.LIVE_PHOTO_TARGET_WIDTH ?? "1200", 10);
const FRAME_DURATION_MS = Number.parseInt(
  process.env.LIVE_PHOTO_FRAME_DURATION_MS ?? "300",
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

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const cloudinaryCloudName = requiredEnv("CLOUDINARY_CLOUD_NAME");
const cloudinaryApiKey = requiredEnv("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = requiredEnv("CLOUDINARY_API_SECRET");

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
  const { data: candidates, error: selectError } = await supabase
    .from("live_photo_render_jobs")
    .select("*")
    .eq("status", "queued")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(1);
  if (selectError) throw selectError;

  const candidate = candidates?.[0];
  if (!candidate) return null;

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("live_photo_render_jobs")
    .update({
      status: "processing",
      attempts: (candidate.attempts ?? 0) + 1,
      started_at: now,
      updated_at: now,
      error_message: null,
    })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed;
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
    const outputPath = path.join(workDir, "framed-live-photo.gif");
    await encodeGif(renderedFramePaths, outputPath);
    const upload = await uploadToCloudinary({
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
    }))
    .filter((asset) => asset.slotIndex >= 0 && asset.secureUrl.startsWith("https://"))
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
    const inputPath = path.join(workDir, `source-${asset.slotIndex}.gif`);
    const outputDir = path.join(workDir, `source-${asset.slotIndex}-frames`);
    await downloadToFile(asset.secureUrl, inputPath);
    await mkdir(outputDir, { recursive: true });
    const frames = await extractGifFrames(inputPath, outputDir);
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
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, bytes);
}

async function extractGifFrames(inputPath, outputDir) {
  const pattern = path.join(outputDir, "frame-%03d.png");
  try {
    await run("ffmpeg", ["-y", "-i", inputPath, "-vsync", "0", pattern]);
  } catch {
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
    const framePath = frames[frameIndex % frames.length];
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
      const input = await sharp(source)
        .resize(width, height, { fit: "cover", position: "center" })
        .png()
        .toBuffer();
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
      `<svg width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif;font-size:${fontSize}px;font-weight:${weight};color:${escapeXml(color)};line-height:1.1;">${escapeXml(text)}</div></foreignObject></svg>`,
    );
    return { input, left, top, opacity };
  }

  return null;
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
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Unable to download image node: ${src}`);
  const buffer = Buffer.from(await response.arrayBuffer());
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
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) return `#${trimmed.slice(3)}`;
  return fallback;
}

async function encodeGif(framePaths, outputPath) {
  const frameRate = (1000 / FRAME_DURATION_MS).toFixed(3);
  await run("ffmpeg", [
    "-y",
    "-framerate",
    frameRate,
    "-i",
    path.join(path.dirname(framePaths[0]), "rendered-%03d.png"),
    "-loop",
    "0",
    "-filter_complex",
    "[0:v] split [a][b];[a] palettegen=stats_mode=diff [p];[b][p] paletteuse=dither=bayer:bayer_scale=5",
    outputPath,
  ]);
}

async function uploadToCloudinary({ filePath, organizationId, sessionId }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = ["poskart", safeSegment(organizationId), safeSegment(sessionId)].join("/");
  const publicId = "framed-live-photo";
  const signaturePayload = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(`${signaturePayload}${cloudinaryApiSecret}`)
    .digest("hex");
  const bytes = await readFile(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: "image/gif" }), "framed-live-photo.gif");
  formData.append("api_key", cloudinaryApiKey);
  formData.append("timestamp", `${timestamp}`);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
    { method: "POST", body: formData },
  );
  const result = await response.json();
  if (!response.ok || !result.secure_url) {
    throw new Error(`Cloudinary upload failed: ${JSON.stringify(result)}`);
  }
  return result;
}

async function saveOutput(job, upload) {
  const now = new Date().toISOString();
  const { error: photoError } = await supabase.from("gallery_photos").upsert(
    {
      session_id: job.session_id,
      organization_id: job.organization_id,
      kind: "framed",
      photo_index: 1,
      cloudinary_public_id: upload.public_id,
      secure_url: upload.secure_url,
      width: upload.width ?? null,
      height: upload.height ?? null,
      bytes: upload.bytes ?? null,
      format: upload.format ?? "gif",
    },
    { onConflict: "session_id,kind,photo_index" },
  );
  if (photoError) throw photoError;

  const { error: jobError } = await supabase
    .from("live_photo_render_jobs")
    .update({
      status: "succeeded",
      output_public_id: upload.public_id,
      output_secure_url: upload.secure_url,
      output_width: upload.width ?? null,
      output_height: upload.height ?? null,
      output_bytes: upload.bytes ?? null,
      output_format: upload.format ?? "gif",
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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with ${code}: ${stderr}`));
      }
    });
  });
}
