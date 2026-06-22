import "server-only";

import { createHash } from "node:crypto";

import { KioskApiError } from "@/lib/kiosk/server";

export type CloudinaryUploadDescriptor = {
  kind: "raw" | "framed" | "live_source";
  photoIndex: number;
};

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new KioskApiError(
      "Cloudinary is not configured on the POSKART server.",
      503,
      "CLOUDINARY_NOT_CONFIGURED",
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function safeSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96);
}

export function createCloudinaryUploadSignatures({
  organizationId,
  sessionId,
  files,
}: {
  organizationId: string;
  sessionId: string;
  files: CloudinaryUploadDescriptor[];
}) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = [
    "poskart",
    safeSegment(organizationId),
    safeSegment(sessionId),
  ].join("/");

  return {
    cloudName,
    apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    uploads: files.map((file) => {
      const publicId = `${file.kind}-${Math.max(0, file.photoIndex)}`;
      const parameters = {
        folder,
        public_id: publicId,
        timestamp,
      };
      const signaturePayload = Object.entries(parameters)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

      return {
        ...file,
        ...parameters,
        signature: createHash("sha1")
          .update(`${signaturePayload}${apiSecret}`)
          .digest("hex"),
      };
    }),
  };
}

export async function deleteCloudinaryAssets(publicIds: string[]) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();

  for (const publicId of publicIds) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = createHash("sha1")
      .update(`${signaturePayload}${apiSecret}`)
      .digest("hex");

    const formData = new URLSearchParams();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (!res.ok) {
        console.error(
          `Failed to delete asset ${publicId} from Cloudinary:`,
          await res.text()
        );
      }
    } catch (e) {
      console.error(`Error deleting asset ${publicId} from Cloudinary:`, e);
    }
  }
}
