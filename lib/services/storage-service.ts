import { createClient } from "@/lib/supabase/client";
export const MAX_BUILDER_IMAGE_SIZE = 8 * 1024 * 1024;
export const MAX_BUILDER_VIDEO_SIZE = 200 * 1024 * 1024;
export const BUILDER_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
export const BUILDER_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
export const BUILDER_MEDIA_ACCEPT = `${BUILDER_IMAGE_ACCEPT},${BUILDER_VIDEO_ACCEPT}`;
export const BUILDER_MEDIA_HELP_TEXT =
  "Images up to 8 MB, MP4/MOV/WebM up to 200 MB";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export function getBuilderImageValidationError(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Unsupported image format. Use JPG, PNG, WebP, GIF, or SVG.";
  }
  if (file.size > MAX_BUILDER_IMAGE_SIZE) {
    return `Image is too large (${formatFileSize(file.size)}). Maximum image size is 8 MB.`;
  }
  return null;
}

export function getBuilderMediaValidationError(file: File) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  if (isImage) return getBuilderImageValidationError(file);

  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  if (!isVideo) {
    return "Unsupported media format. Use JPG, PNG, WebP, GIF, SVG, MP4, MOV, or WebM video.";
  }
  if (file.size > MAX_BUILDER_VIDEO_SIZE) {
    return `Video is too large (${formatFileSize(file.size)}). Maximum video size is 200 MB.`;
  }
  return null;
}

export async function uploadBuilderImage(file: File) {
  const validationError = getBuilderImageValidationError(file);
  if (validationError) throw new Error(validationError);
  return uploadBuilderMedia(file);
}

/**
 * Upload image OR video to the private builder-assets API.
 * The API stores files in Cloudflare R2 and returns a public delivery URL.
 * Images: JPG, PNG, WebP, GIF, SVG — max 8 MB
 * Videos: MP4, MOV, WebM — max 200 MB
 */
export async function uploadBuilderMedia(
  file: File,
): Promise<{
  url: string;
  path: string;
  type: "image" | "video";
  storage?: string;
}> {
  const validationError = getBuilderMediaValidationError(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to upload builder media.");
  }

  const response = await fetch("/api/kiosk/builder/assets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  const payload = (await response.json().catch(() => null)) as {
    uploadUrl?: string;
    url?: string;
    path?: string;
    type?: "image" | "video";
    storage?: string;
    error?: string;
  } | null;

  if (response.status === 413) {
    throw new Error(
      "The selected file is too large for this upload route. Use an image up to 8 MB or MP4/MOV/WebM up to 200 MB.",
    );
  }

  if (
    !response.ok ||
    !payload?.uploadUrl ||
    !payload.url ||
    !payload.path ||
    !payload.type
  ) {
    throw new Error(payload?.error || "Unable to upload builder media.");
  }

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(payload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
  } catch {
    throw new Error(
      "Cloudflare R2 upload was blocked by CORS. Add your web origin to the R2 bucket CORS policy, then try again.",
    );
  }

  if (uploadResponse.status === 413) {
    throw new Error("The selected file is too large for Cloudflare R2 upload.");
  }

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload builder media to Cloudflare R2.");
  }

  return {
    url: payload.url,
    path: payload.path,
    type: payload.type,
    storage: payload.storage,
  };
}

/**
 * Upload an image meant for the Asset Library. New assets use R2 so the
 * legacy Supabase Storage bucket can remain read-only during migration.
 */
export async function uploadLibraryAsset(
  file: File,
): Promise<{ url: string; path: string; size: string }> {
  const validationError = getBuilderImageValidationError(file);
  if (validationError) throw new Error(validationError);
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to upload an asset.");

  const intentResponse = await fetch("/api/admin/assets/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  const intent = (await intentResponse.json().catch(() => null)) as {
    uploadUrl?: string;
    url?: string;
    path?: string;
    error?: string;
  } | null;
  if (!intentResponse.ok || !intent.uploadUrl || !intent.url || !intent.path) {
    throw new Error(intent?.error || "Unable to create asset upload.");
  }
  const uploadResponse = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error("Unable to upload asset to R2.");

  const sizeKb = Math.max(1, Math.round(file.size / 1024));
  const size =
    sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
  return { url: intent.url, path: intent.path, size };
}
