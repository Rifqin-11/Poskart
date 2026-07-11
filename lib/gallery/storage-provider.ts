import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteCloudinaryAssets } from "@/lib/cloudinary/server";
import {
  decryptCredential,
  encryptCredential,
  type EncryptedSecret,
} from "@/lib/security/credentials";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { KioskApiError } from "@/lib/kiosk/server";

const CONFIG_ID = "default";
const STORAGE_PROVIDERS = ["cloudinary", "imagekit"] as const;

export type GalleryStorageProvider = (typeof STORAGE_PROVIDERS)[number];

export type GalleryUploadDescriptor = {
  kind: "raw" | "framed" | "live_source";
  photoIndex: number;
  resourceType?: "image" | "video";
  fileName?: string;
};

type GalleryStorageConfigRow = {
  gallery_storage_provider: string | null;
  gallery_imagekit_public_key: string | null;
  gallery_imagekit_private_key_ciphertext: string | null;
  gallery_imagekit_private_key_iv: string | null;
  gallery_imagekit_private_key_tag: string | null;
  gallery_imagekit_private_key_last4: string | null;
  gallery_imagekit_url_endpoint: string | null;
  gallery_cloudinary_cloud_name: string | null;
  gallery_cloudinary_api_key: string | null;
  gallery_cloudinary_api_secret_ciphertext: string | null;
  gallery_cloudinary_api_secret_iv: string | null;
  gallery_cloudinary_api_secret_tag: string | null;
  gallery_cloudinary_api_secret_last4: string | null;
};

export type GalleryStorageSummary = {
  provider: GalleryStorageProvider;
  imagekit: {
    publicKey: string;
    urlEndpoint: string;
    hasPrivateKey: boolean;
    privateKeyLast4: string | null;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    hasApiSecret: boolean;
    apiSecretLast4: string | null;
    usingEnvFallback: boolean;
  };
};

export type SaveGalleryStorageInput = {
  provider: GalleryStorageProvider;
  imagekit?: {
    publicKey?: string;
    privateKey?: string;
    urlEndpoint?: string;
  };
  cloudinary?: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  };
};

export async function getGalleryStorageSummary(): Promise<GalleryStorageSummary> {
  const supabase = createSupabaseAdminClient();
  const row = await getGalleryStorageConfigRow(supabase);
  const cloudinaryEnv = getCloudinaryEnvConfig();

  return {
    provider: normalizeProvider(row?.gallery_storage_provider),
    imagekit: {
      publicKey: row?.gallery_imagekit_public_key ?? "",
      urlEndpoint: row?.gallery_imagekit_url_endpoint ?? "",
      hasPrivateKey: Boolean(row?.gallery_imagekit_private_key_last4),
      privateKeyLast4: row?.gallery_imagekit_private_key_last4 ?? null,
    },
    cloudinary: {
      cloudName: row?.gallery_cloudinary_cloud_name ?? cloudinaryEnv.cloudName ?? "",
      apiKey: row?.gallery_cloudinary_api_key ?? cloudinaryEnv.apiKey ?? "",
      hasApiSecret: Boolean(
        row?.gallery_cloudinary_api_secret_last4 || cloudinaryEnv.apiSecret,
      ),
      apiSecretLast4:
        row?.gallery_cloudinary_api_secret_last4 ??
        cloudinaryEnv.apiSecret?.slice(-4) ??
        null,
      usingEnvFallback: !row?.gallery_cloudinary_api_secret_last4,
    },
  };
}

export async function saveGalleryStorageSettings(input: SaveGalleryStorageInput) {
  const supabase = createSupabaseAdminClient();
  const existing = await getGalleryStorageConfigRow(supabase);
  const provider = normalizeProvider(input.provider);
  const imagekitPrivateKey = input.imagekit?.privateKey?.trim() ?? "";
  const cloudinaryApiSecret = input.cloudinary?.apiSecret?.trim() ?? "";
  const imagekitSecret = imagekitPrivateKey
    ? encryptCredential(imagekitPrivateKey)
    : existing
      ? existingSecret(existing, "gallery_imagekit_private_key")
      : null;
  const cloudinarySecret = cloudinaryApiSecret
    ? encryptCredential(cloudinaryApiSecret)
    : existing
      ? existingSecret(existing, "gallery_cloudinary_api_secret")
      : null;

  if (provider === "imagekit") {
    if (!input.imagekit?.publicKey?.trim()) {
      throw new Error("ImageKit public key is required.");
    }
    if (!input.imagekit?.urlEndpoint?.trim()) {
      throw new Error("ImageKit URL endpoint is required.");
    }
    if (!imagekitSecret?.ciphertext) {
      throw new Error("ImageKit private key is required.");
    }
  }

  if (provider === "cloudinary") {
    const env = getCloudinaryEnvConfig();
    if (!input.cloudinary?.cloudName?.trim() && !env.cloudName) {
      throw new Error("Cloudinary cloud name is required.");
    }
    if (!input.cloudinary?.apiKey?.trim() && !env.apiKey) {
      throw new Error("Cloudinary API key is required.");
    }
    if (!cloudinarySecret?.ciphertext && !env.apiSecret) {
      throw new Error("Cloudinary API secret is required.");
    }
  }

  const payload: Record<string, unknown> = {
    id: CONFIG_ID,
    gallery_storage_provider: provider,
    gallery_imagekit_public_key: input.imagekit?.publicKey?.trim() ?? "",
    gallery_imagekit_url_endpoint: normalizeImageKitEndpoint(
      input.imagekit?.urlEndpoint,
    ),
    gallery_cloudinary_cloud_name: input.cloudinary?.cloudName?.trim() ?? "",
    gallery_cloudinary_api_key: input.cloudinary?.apiKey?.trim() ?? "",
    updated_at: new Date().toISOString(),
  };

  applySecretPayload(payload, "gallery_imagekit_private_key", imagekitSecret);
  applySecretPayload(payload, "gallery_cloudinary_api_secret", cloudinarySecret);

  const { error } = await supabase.from("app_configs").upsert(payload);
  if (error) throw new Error(`Unable to save gallery storage: ${error.message}`);
}

export async function createGalleryUploadSignatures({
  organizationId,
  sessionId,
  files,
}: {
  organizationId: string;
  sessionId: string;
  files: GalleryUploadDescriptor[];
}) {
  const config = await resolveActiveStorageConfig();
  if (config.provider === "imagekit") {
    return createImageKitUploadSignatures({
      config,
      organizationId,
      sessionId,
      files,
    });
  }

  return createCloudinaryUploadSignaturesFromConfig({
    config,
    organizationId,
    sessionId,
    files,
  });
}

export type GalleryStoredAsset = {
  storage_provider?: GalleryStorageProvider;
  provider_public_id?: string;
  cloudinary_public_id?: string;
  resource_type?: "image" | "video";
};

export async function deleteGalleryAssets(assets: GalleryStoredAsset[]) {
  const cloudinaryIds = assets
    .filter((asset) => normalizeProvider(asset.storage_provider) === "cloudinary")
    .map((asset) => asset.provider_public_id || asset.cloudinary_public_id)
    .filter((id): id is string => Boolean(id));
  const imageKitIds = assets
    .filter((asset) => normalizeProvider(asset.storage_provider) === "imagekit")
    .map((asset) => asset.provider_public_id || asset.cloudinary_public_id)
    .filter((id): id is string => Boolean(id));

  if (cloudinaryIds.length > 0) {
    await deleteCloudinaryAssets(Array.from(new Set(cloudinaryIds)));
  }
  if (imageKitIds.length > 0) {
    await deleteImageKitAssets(Array.from(new Set(imageKitIds)));
  }
}

export function normalizeProvider(value: unknown): GalleryStorageProvider {
  return typeof value === "string" &&
    STORAGE_PROVIDERS.includes(value as GalleryStorageProvider)
    ? (value as GalleryStorageProvider)
    : "cloudinary";
}

function createCloudinaryUploadSignaturesFromConfig({
  config,
  organizationId,
  sessionId,
  files,
}: {
  config: ResolvedCloudinaryConfig;
  organizationId: string;
  sessionId: string;
  files: GalleryUploadDescriptor[];
}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = [
    "poskart",
    safeSegment(organizationId),
    safeSegment(sessionId),
  ].join("/");

  return {
    provider: "cloudinary" as const,
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    uploads: files.map((file) => {
      const publicId = `${file.kind}-${Math.max(0, file.photoIndex)}`;
      const resourceType = file.resourceType === "video" ? "video" : "image";
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
        provider: "cloudinary" as const,
        resourceType,
        uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
        ...parameters,
        signature: crypto
          .createHash("sha1")
          .update(`${signaturePayload}${config.apiSecret}`)
          .digest("hex"),
      };
    }),
  };
}

function createImageKitUploadSignatures({
  config,
  organizationId,
  sessionId,
  files,
}: {
  config: ResolvedImageKitConfig;
  organizationId: string;
  sessionId: string;
  files: GalleryUploadDescriptor[];
}) {
  const folder = [
    "/poskart",
    safeSegment(organizationId),
    safeSegment(sessionId),
  ].join("/");
  const expire = Math.floor(Date.now() / 1000) + 30 * 60;

  return {
    provider: "imagekit" as const,
    apiKey: config.publicKey,
    publicKey: config.publicKey,
    urlEndpoint: config.urlEndpoint,
    uploadUrl: "https://upload.imagekit.io/api/v1/files/upload",
    uploads: files.map((file) => {
      const token = crypto.randomUUID();
      const resourceType = file.resourceType === "video" ? "video" : "image";
      const fileName = safeFileName(
        file.fileName,
        `${file.kind}-${Math.max(0, file.photoIndex)}.${
          resourceType === "video" ? "mp4" : "jpg"
        }`,
      );

      return {
        ...file,
        provider: "imagekit" as const,
        resourceType,
        uploadUrl: "https://upload.imagekit.io/api/v1/files/upload",
        publicKey: config.publicKey,
        apiKey: config.publicKey,
        token,
        expire,
        signature: crypto
          .createHmac("sha1", config.privateKey)
          .update(`${token}${expire}`)
          .digest("hex"),
        folder,
        fileName,
        useUniqueFileName: false,
      };
    }),
  };
}

type ResolvedCloudinaryConfig = {
  provider: "cloudinary";
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type ResolvedImageKitConfig = {
  provider: "imagekit";
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
};

async function resolveActiveStorageConfig(): Promise<
  ResolvedCloudinaryConfig | ResolvedImageKitConfig
> {
  const supabase = createSupabaseAdminClient();
  const row = await getGalleryStorageConfigRow(supabase);
  const provider = normalizeProvider(row?.gallery_storage_provider);

  if (provider === "imagekit") {
    const privateKey = decryptCredential({
      ciphertext: row?.gallery_imagekit_private_key_ciphertext ?? null,
      iv: row?.gallery_imagekit_private_key_iv ?? null,
      tag: row?.gallery_imagekit_private_key_tag ?? null,
    });
    const publicKey = row?.gallery_imagekit_public_key?.trim() ?? "";
    const urlEndpoint = normalizeImageKitEndpoint(
      row?.gallery_imagekit_url_endpoint,
    );
    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new KioskApiError(
        "ImageKit gallery storage is not configured.",
        503,
        "IMAGEKIT_NOT_CONFIGURED",
      );
    }
    return { provider: "imagekit", publicKey, privateKey, urlEndpoint };
  }

  const env = getCloudinaryEnvConfig();
  const apiSecret =
    decryptCredential({
      ciphertext: row?.gallery_cloudinary_api_secret_ciphertext ?? null,
      iv: row?.gallery_cloudinary_api_secret_iv ?? null,
      tag: row?.gallery_cloudinary_api_secret_tag ?? null,
    }) ?? env.apiSecret;
  const cloudName = row?.gallery_cloudinary_cloud_name?.trim() || env.cloudName;
  const apiKey = row?.gallery_cloudinary_api_key?.trim() || env.apiKey;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new KioskApiError(
      "Cloudinary gallery storage is not configured.",
      503,
      "CLOUDINARY_NOT_CONFIGURED",
    );
  }
  return { provider: "cloudinary", cloudName, apiKey, apiSecret };
}

async function deleteImageKitAssets(fileIds: string[]) {
  const config = await resolveImageKitDeleteConfig();
  const authorization = `Basic ${Buffer.from(`${config.privateKey}:`).toString(
    "base64",
  )}`;

  for (const fileId of fileIds) {
    try {
      const response = await fetch(
        `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
          headers: { Authorization: authorization },
        },
      );
      if (!response.ok && response.status !== 404) {
        console.error(
          `Failed to delete ImageKit asset ${fileId}:`,
          await response.text(),
        );
      }
    } catch (error) {
      console.error(`Error deleting ImageKit asset ${fileId}:`, error);
    }
  }
}

async function resolveImageKitDeleteConfig(): Promise<ResolvedImageKitConfig> {
  const supabase = createSupabaseAdminClient();
  const row = await getGalleryStorageConfigRow(supabase);
  const privateKey = decryptCredential({
    ciphertext: row?.gallery_imagekit_private_key_ciphertext ?? null,
    iv: row?.gallery_imagekit_private_key_iv ?? null,
    tag: row?.gallery_imagekit_private_key_tag ?? null,
  });
  const publicKey = row?.gallery_imagekit_public_key?.trim() ?? "";
  const urlEndpoint = normalizeImageKitEndpoint(
    row?.gallery_imagekit_url_endpoint,
  );
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error("ImageKit gallery storage is not configured.");
  }
  return { provider: "imagekit", publicKey, privateKey, urlEndpoint };
}

async function getGalleryStorageConfigRow(client: SupabaseClient) {
  const { data, error } = await client
    .from("app_configs")
    .select(
      "gallery_storage_provider,gallery_imagekit_public_key,gallery_imagekit_private_key_ciphertext,gallery_imagekit_private_key_iv,gallery_imagekit_private_key_tag,gallery_imagekit_private_key_last4,gallery_imagekit_url_endpoint,gallery_cloudinary_cloud_name,gallery_cloudinary_api_key,gallery_cloudinary_api_secret_ciphertext,gallery_cloudinary_api_secret_iv,gallery_cloudinary_api_secret_tag,gallery_cloudinary_api_secret_last4",
    )
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (error) {
    if (error.code === "42703") return null;
    throw new Error(`Unable to load gallery storage config: ${error.message}`);
  }

  return (data ?? null) as GalleryStorageConfigRow | null;
}

function existingSecret(
  row: GalleryStorageConfigRow,
  prefix: "gallery_imagekit_private_key" | "gallery_cloudinary_api_secret",
): EncryptedSecret | null {
  const ciphertext = row[`${prefix}_ciphertext`];
  const iv = row[`${prefix}_iv`];
  const tag = row[`${prefix}_tag`];
  const last4 = row[`${prefix}_last4`];
  if (!ciphertext || !iv || !tag || !last4) return null;
  return { ciphertext, iv, tag, last4 };
}

function applySecretPayload(
  payload: Record<string, unknown>,
  prefix: "gallery_imagekit_private_key" | "gallery_cloudinary_api_secret",
  secret: EncryptedSecret | null,
) {
  if (!secret) return;
  payload[`${prefix}_ciphertext`] = secret.ciphertext;
  payload[`${prefix}_iv`] = secret.iv;
  payload[`${prefix}_tag`] = secret.tag;
  payload[`${prefix}_last4`] = secret.last4;
}

function getCloudinaryEnvConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || null,
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || null,
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || null,
  };
}

function normalizeImageKitEndpoint(value: unknown) {
  const endpoint = typeof value === "string" ? value.trim() : "";
  if (!endpoint) return "";
  return endpoint.replace(/\/+$/, "");
}

function safeSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 96);
}

function safeFileName(value: unknown, fallback: string) {
  const fileName = typeof value === "string" ? value.trim() : "";
  const candidate = fileName || fallback;
  return candidate.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}
