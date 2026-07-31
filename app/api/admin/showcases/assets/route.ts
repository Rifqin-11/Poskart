import { recordKioskAssetManifest } from "@/lib/assets/asset-manifest";
import { jsonError, jsonOk } from "@/lib/kiosk/server";
import { createR2SignedUploadUrl } from "@/lib/r2/server";
import { verifyRole } from "@/server/admin/context";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function safeFileName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/(^-|-$)/g, "") || "showcase-image"
  );
}

function validateUpload(fileType: string, fileSize: number) {
  if (!ALLOWED_IMAGE_TYPES.has(fileType)) {
    return "Unsupported image format. Use JPG, PNG, WebP, GIF, or SVG.";
  }
  if (fileSize > MAX_IMAGE_SIZE) {
    return "Image must be 8 MB or smaller.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { organizationId } = await verifyRole(["owner", "admin", "designer"]);
    const payload = (await request.json().catch(() => null)) as {
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    } | null;
    const fileName = payload?.fileName?.trim();
    const fileType = payload?.fileType?.trim();
    const fileSize = payload?.fileSize;

    if (!fileName || !fileType || typeof fileSize !== "number") {
      return jsonOk({ error: "Invalid showcase upload intent." }, { status: 400 });
    }

    const validationError = validateUpload(fileType, fileSize);
    if (validationError) {
      return jsonOk({ error: validationError }, { status: 400 });
    }

    const key = `organizations/${organizationId}/showcases/${crypto.randomUUID()}-${safeFileName(fileName)}`;
    const signed = await createR2SignedUploadUrl({
      key,
      contentType: fileType,
    });
    await recordKioskAssetManifest({
      organizationId,
      sourceUrl: signed.url,
      deliveryUrl: signed.url,
      revision: `${signed.key}:${fileSize}`,
      byteSize: fileSize,
      contentType: fileType,
    });

    return jsonOk({
      uploadUrl: signed.uploadUrl,
      url: signed.url,
      path: signed.key,
    });
  } catch (error) {
    return jsonError(error);
  }
}
