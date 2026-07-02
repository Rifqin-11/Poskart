import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2UploadInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

type R2UploadResult = {
  key: string;
  url: string;
};

type R2SignedUploadInput = {
  key: string;
  contentType: string;
  expiresIn?: number;
};

type R2SignedUploadResult = R2UploadResult & {
  uploadUrl: string;
  expiresIn: number;
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
};

let client: S3Client | null = null;
let config: R2Config | null = null;

function getR2Config(): R2Config {
  if (config) return config;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !endpoint ||
    !publicBaseUrl
  ) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL.",
    );
  }

  config = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
  return config;
}

function getR2Client() {
  if (client) return client;
  const r2 = getR2Config();

  client = new S3Client({
    region: "auto",
    endpoint: r2.endpoint,
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
  });

  return client;
}

function getR2PublicUrl(key: string) {
  const r2 = getR2Config();
  return `${r2.publicBaseUrl}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export async function uploadR2Object({
  key,
  body,
  contentType,
}: R2UploadInput): Promise<R2UploadResult> {
  const r2 = getR2Config();

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: getR2PublicUrl(key),
  };
}

export async function createR2SignedUploadUrl({
  key,
  contentType,
  expiresIn = 300,
}: R2SignedUploadInput): Promise<R2SignedUploadResult> {
  const r2 = getR2Config();
  const command = new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  return {
    key,
    url: getR2PublicUrl(key),
    uploadUrl: await getSignedUrl(getR2Client(), command, { expiresIn }),
    expiresIn,
  };
}
