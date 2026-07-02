import { jsonError, jsonOk, requireKioskContext } from "@/lib/kiosk/server";
import { createR2SignedUploadUrl, uploadR2Object } from "@/lib/r2/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

type BuilderMediaKind = "image" | "video";

type MediaValidationResult =
  | {
      ok: true;
      type: BuilderMediaKind;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
    };

function safeFileName(name: string) {
  const safe = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return safe || "media";
}

function validateBuilderMedia(fileType: string, fileSize: number): MediaValidationResult {
  const isImage = ALLOWED_IMAGE_TYPES.has(fileType);
  const isVideo = ALLOWED_VIDEO_TYPES.has(fileType);

  if (!isImage && !isVideo) {
    return {
      ok: false,
      status: 400,
      error: "Unsupported file. Use JPG, PNG, WebP, GIF, SVG, MP4, WebM, or MOV.",
      code: "BUILDER_FILE_UNSUPPORTED",
    };
  }
  if (isImage && fileSize > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      status: 400,
      error: "Image must be 8 MB or smaller.",
      code: "BUILDER_IMAGE_TOO_LARGE",
    };
  }
  if (isVideo && fileSize > MAX_VIDEO_SIZE) {
    return {
      ok: false,
      status: 400,
      error: "Video must be 200 MB or smaller.",
      code: "BUILDER_VIDEO_TOO_LARGE",
    };
  }

  return { ok: true, type: isVideo ? "video" : "image" };
}

function buildBuilderMediaPath(
  organizationId: string,
  fileName: string,
  type: BuilderMediaKind,
) {
  const folder = type === "video" ? "builder/videos" : "builder/images";
  return `organizations/${organizationId}/${folder}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await request.json().catch(() => null)) as {
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      } | null;

      const fileName = payload?.fileName?.trim();
      const fileType = payload?.fileType?.trim();
      const fileSize = payload?.fileSize;
      if (!fileName || !fileType || typeof fileSize !== "number") {
        return jsonOk(
          {
            error: "fileName, fileType, and fileSize are required.",
            code: "BUILDER_UPLOAD_INTENT_INVALID",
          },
          { status: 400 },
        );
      }

      const validation = validateBuilderMedia(fileType, fileSize);
      if (!validation.ok) {
        return jsonOk(
          { error: validation.error, code: validation.code },
          { status: validation.status },
        );
      }

      const filePath = buildBuilderMediaPath(
        context.organizationId,
        fileName,
        validation.type,
      );
      const signed = await createR2SignedUploadUrl({
        key: filePath,
        contentType: fileType,
      });

      return jsonOk({
        uploadUrl: signed.uploadUrl,
        expiresIn: signed.expiresIn,
        url: signed.url,
        path: signed.key,
        type: validation.type,
        storage: "cloudflare-r2",
      });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return jsonOk(
        { error: "file field is required", code: "BUILDER_FILE_REQUIRED" },
        { status: 400 },
      );
    }

    const validation = validateBuilderMedia(file.type, file.size);
    if (!validation.ok) {
      return jsonOk(
        { error: validation.error, code: validation.code },
        { status: validation.status },
      );
    }

    const filePath = buildBuilderMediaPath(
      context.organizationId,
      file.name,
      validation.type,
    );
    const uploaded = await uploadR2Object({
      key: filePath,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    return jsonOk({
      url: uploaded.url,
      path: uploaded.key,
      type: validation.type,
      storage: "cloudflare-r2",
    });
  } catch (error) {
    return jsonError(error);
  }
}
