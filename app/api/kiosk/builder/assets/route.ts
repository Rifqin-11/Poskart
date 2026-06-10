import { jsonError, jsonOk, requireKioskContext } from "@/lib/kiosk/server";

const BUILDER_BUCKET = "builder-assets";
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

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return jsonOk(
        { error: "file field is required", code: "BUILDER_FILE_REQUIRED" },
        { status: 400 },
      );
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);
    if (!isImage && !isVideo) {
      return jsonOk(
        {
          error: "Unsupported file. Use JPG, PNG, WebP, GIF, SVG, MP4, WebM, or MOV.",
          code: "BUILDER_FILE_UNSUPPORTED",
        },
        { status: 400 },
      );
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return jsonOk(
        { error: "Image must be 8 MB or smaller.", code: "BUILDER_IMAGE_TOO_LARGE" },
        { status: 400 },
      );
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return jsonOk(
        { error: "Video must be 200 MB or smaller.", code: "BUILDER_VIDEO_TOO_LARGE" },
        { status: 400 },
      );
    }

    const folder = isVideo ? "builder/videos" : "builder/images";
    const filePath = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await context.client.storage
      .from(BUILDER_BUCKET)
      .upload(filePath, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });
    if (error) throw error;

    const { data } = context.client.storage
      .from(BUILDER_BUCKET)
      .getPublicUrl(filePath);

    return jsonOk({
      url: data.publicUrl,
      path: filePath,
      type: isVideo ? "video" : "image",
    });
  } catch (error) {
    return jsonError(error);
  }
}
