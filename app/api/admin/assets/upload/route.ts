import { jsonError, jsonOk } from "@/lib/kiosk/server";
import { getAdminContext } from "@/server/admin/context";
import { recordKioskAssetManifest } from "@/lib/assets/asset-manifest";
import { createR2SignedUploadUrl, uploadR2Object } from "@/lib/r2/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
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
      .replace(/(^-|-$)/g, "") || "asset"
  );
}

function validate(fileType: string, fileSize: number) {
  if (!ALLOWED_TYPES.has(fileType)) {
    return "Unsupported image format. Use JPG, PNG, WebP, GIF, or SVG.";
  }
  if (fileSize > MAX_IMAGE_SIZE) {
    return "Image must be 8 MB or smaller.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { organizationId } = await getAdminContext();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as {
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      } | null;
      const fileName = body?.fileName?.trim();
      const fileType = body?.fileType?.trim();
      const fileSize = body?.fileSize;
      if (!fileName || !fileType || typeof fileSize !== "number") {
        return jsonOk({ error: "Invalid upload intent." }, { status: 400 });
      }
      const validationError = validate(fileType, fileSize);
      if (validationError) return jsonOk({ error: validationError }, { status: 400 });

      const key = `organizations/${organizationId}/library/${crypto.randomUUID()}-${safeFileName(fileName)}`;
      const signed = await createR2SignedUploadUrl({ key, contentType: fileType });
      await recordKioskAssetManifest({
        organizationId,
        sourceUrl: signed.url,
        deliveryUrl: signed.url,
        revision: `${signed.key}:${fileSize}`,
        byteSize: fileSize,
        contentType: fileType,
      });
      return jsonOk({ uploadUrl: signed.uploadUrl, url: signed.url, path: signed.key });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonOk({ error: "file is required." }, { status: 400 });
    const validationError = validate(file.type, file.size);
    if (validationError) return jsonOk({ error: validationError }, { status: 400 });

    const key = `organizations/${organizationId}/library/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await uploadR2Object({
      key,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });
    await recordKioskAssetManifest({
      organizationId,
      sourceUrl: uploaded.url,
      deliveryUrl: uploaded.url,
      revision: `${uploaded.key}:${file.size}`,
      byteSize: file.size,
      contentType: file.type,
    });
    return jsonOk({ url: uploaded.url, path: uploaded.key });
  } catch (error) {
    return jsonError(error);
  }
}
