import { createClient } from "@/lib/supabase/client";

const BUILDER_BUCKET = "builder-assets";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function uploadBuilderImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, WebP, GIF, or SVG images are supported.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be 8 MB or smaller.");
  }
  const supabase = createClient();
  const filePath = `builder/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUILDER_BUCKET).upload(filePath, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw new Error(`Unable to upload image: ${uploadError.message}`);
  const { data } = supabase.storage.from(BUILDER_BUCKET).getPublicUrl(filePath);
  await supabase.from("assets").upsert({
    id: `AST-${crypto.randomUUID()}`,
    name: file.name,
    folder: "Builder Uploads",
    tag: "builder",
    version: "v1",
    size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    updated_at: new Date().toISOString(),
  });
  return { url: data.publicUrl, path: filePath };
}

/**
 * Upload image OR video to Supabase Storage.
 * Images: JPG, PNG, WebP, GIF, SVG — max 8 MB
 * Videos: MP4, WebM, MOV — max 200 MB
 */
export async function uploadBuilderMedia(
  file: File,
): Promise<{ url: string; path: string; type: "image" | "video" }> {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error("Unsupported file. Use JPG, PNG, WebP, MP4, WebM, or MOV.");
  }
  if (isImage && file.size > MAX_IMAGE_SIZE) throw new Error("Image must be 8 MB or smaller.");
  if (isVideo && file.size > MAX_VIDEO_SIZE) throw new Error("Video must be 200 MB or smaller.");

  const supabase = createClient();
  const folder = isVideo ? "builder/videos" : "builder/images";
  const filePath = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from(BUILDER_BUCKET).upload(filePath, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(`Unable to upload: ${error.message}`);

  const { data } = supabase.storage.from(BUILDER_BUCKET).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath, type: isVideo ? "video" : "image" };
}
