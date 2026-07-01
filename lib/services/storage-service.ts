import { createClient } from "@/lib/supabase/client";

const BUILDER_BUCKET = "builder-assets";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uploadBuilderImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, WebP, GIF, or SVG images are supported.");
  }
  return uploadBuilderMedia(file);
}

/**
 * Upload image OR video to the private builder-assets API.
 * The API stores files in Cloudflare R2 and returns a public delivery URL.
 * Images: JPG, PNG, WebP, GIF, SVG — max 8 MB
 * Videos: MP4, WebM, MOV — max 200 MB
 */
export async function uploadBuilderMedia(
  file: File,
): Promise<{
  url: string;
  path: string;
  type: "image" | "video";
  storage?: string;
}> {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error("Unsupported file. Use JPG, PNG, WebP, MP4, WebM, or MOV.");
  }
  if (isImage && file.size > MAX_IMAGE_SIZE)
    throw new Error("Image must be 8 MB or smaller.");
  if (isVideo && file.size > MAX_VIDEO_SIZE)
    throw new Error("Video must be 200 MB or smaller.");

  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to upload builder media.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/kiosk/builder/assets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    path?: string;
    type?: "image" | "video";
    storage?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.url || !payload.path || !payload.type) {
    throw new Error(payload?.error || "Unable to upload builder media.");
  }

  return {
    url: payload.url,
    path: payload.path,
    type: payload.type,
    storage: payload.storage,
  };
}

/**
 * Upload an image meant for the Asset Library (admin Media & Asset Library).
 * Returns the public URL, storage path, and human-readable size string.
 */
export async function uploadLibraryAsset(
  file: File,
): Promise<{ url: string; path: string; size: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, WebP, GIF, or SVG images are supported.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be 8 MB or smaller.");
  }
  const supabase = createClient();
  const path = `library/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(BUILDER_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
  if (error) throw new Error(`Unable to upload asset: ${error.message}`);

  const { data } = supabase.storage.from(BUILDER_BUCKET).getPublicUrl(path);
  const sizeKb = Math.max(1, Math.round(file.size / 1024));
  const size =
    sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
  return { url: data.publicUrl, path, size };
}
