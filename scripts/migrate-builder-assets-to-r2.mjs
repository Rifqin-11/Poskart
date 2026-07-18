import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const apply = process.argv.includes("--apply");
const legacyMarker = "/storage/v1/object/public/builder-assets/";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const r2 = new S3Client({
  region: "auto",
  endpoint:
    process.env.R2_ENDPOINT ||
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

let publicBaseUrl;
let bucket;

function assertEnvironment() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment: ${missing.join(", ")}`);
  publicBaseUrl = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  bucket = process.env.R2_BUCKET_NAME;
}

function extractLegacyPath(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    const index = url.pathname.indexOf(legacyMarker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + legacyMarker.length));
  } catch {
    return null;
  }
}

function parseEmbeddedMigrationRecord(value) {
  if (typeof value !== "string" || !value.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.sourceUrl === "string" &&
      typeof parsed.deliveryUrl === "string"
    ) {
      return parsed;
    }
  } catch {
    // It is a normal string value, not a previously serialized migration row.
  }
  return null;
}

function isMigrationRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.sourceUrl === "string" &&
    typeof value.deliveryUrl === "string"
  );
}

function collectLegacyUrls(value, result = new Set()) {
  if (typeof value === "string") {
    const embedded = parseEmbeddedMigrationRecord(value);
    if (embedded) collectLegacyUrls(embedded.sourceUrl, result);
    else if (extractLegacyPath(value)) result.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectLegacyUrls(item, result));
  } else if (isMigrationRecord(value)) {
    collectLegacyUrls(value.sourceUrl, result);
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectLegacyUrls(item, result));
  }
  return result;
}

function replaceLegacyUrls(value, replacements) {
  if (typeof value === "string") {
    const embedded = parseEmbeddedMigrationRecord(value);
    if (embedded) {
      return replacements.get(embedded.sourceUrl)?.deliveryUrl || embedded.deliveryUrl;
    }
    return replacements.get(value)?.deliveryUrl || value;
  }
  if (Array.isArray(value)) return value.map((item) => replaceLegacyUrls(item, replacements));
  if (isMigrationRecord(value)) {
    return replacements.get(value.sourceUrl)?.deliveryUrl || value.deliveryUrl;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceLegacyUrls(item, replacements)]),
    );
  }
  return value;
}

function publicUrl(key) {
  return `${publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function migrateObject(url) {
  const path = extractLegacyPath(url);
  if (!path) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while reading ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const key = `legacy/builder-assets/${path}`;
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  if (apply) {
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: { source: "supabase-builder-assets", sha256: contentHash },
      }),
    );
  }

  return {
    sourceUrl: url,
    deliveryUrl: publicUrl(key),
    key,
    contentType,
    byteSize: bytes.byteLength,
    contentHash,
    revision: `${contentHash}:${bytes.byteLength}`,
  };
}

async function main() {
  assertEnvironment();
  const [templatesResult, layoutsResult, assetsResult] = await Promise.all([
    supabase.from("templates").select("id,organization_id,frame_image_url,frame_layout"),
    supabase.from("layout_schemas").select("id,organization_id,schema"),
    supabase.from("assets").select("id,organization_id,url,storage_path"),
  ]);
  for (const result of [templatesResult, layoutsResult, assetsResult]) {
    if (result.error) throw result.error;
  }

  const templates = templatesResult.data || [];
  const layouts = layoutsResult.data || [];
  const assets = assetsResult.data || [];
  const allReferences = new Set();
  templates.forEach((row) => {
    collectLegacyUrls(row.frame_image_url, allReferences);
    collectLegacyUrls(row.frame_layout, allReferences);
  });
  layouts.forEach((row) => collectLegacyUrls(row.schema, allReferences));
  assets.forEach((row) => collectLegacyUrls(row.url, allReferences));

  const migrated = new Map();
  for (const url of allReferences) {
    const result = await migrateObject(url);
    if (result) migrated.set(url, result);
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        referencedUrls: allReferences.size,
        migratedObjects: migrated.size,
        totalBytes: [...migrated.values()].reduce((total, item) => total + item.byteSize, 0),
        objects: [...migrated.values()].map(({ sourceUrl, deliveryUrl, byteSize, revision }) => ({
          sourceUrl,
          deliveryUrl,
          byteSize,
          revision,
        })),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Dry run only. Re-run with --apply after verifying the manifest.");
    return;
  }

  for (const row of templates) {
    const frameImageUrl = replaceLegacyUrls(row.frame_image_url, migrated);
    const frameLayout = replaceLegacyUrls(row.frame_layout, migrated);
    const { error } = await supabase
      .from("templates")
      .update({ frame_image_url: frameImageUrl, frame_layout: frameLayout, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
  }
  for (const row of layouts) {
    const schema = replaceLegacyUrls(row.schema, migrated);
    const { error } = await supabase
      .from("layout_schemas")
      .update({ schema, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
  }
  for (const row of assets) {
    const url = replaceLegacyUrls(row.url, migrated);
    const storagePath = row.storage_path && migrated.get(row.url)?.key;
    const { error } = await supabase
      .from("assets")
      .update({ url, ...(storagePath ? { storage_path: storagePath } : {}) })
      .eq("id", row.id);
    if (error) throw error;
  }

  for (const row of [...templates, ...layouts]) {
    const references = new Set();
    collectLegacyUrls(row.frame_image_url, references);
    collectLegacyUrls(row.frame_layout, references);
    collectLegacyUrls(row.schema, references);
    for (const sourceUrl of references) {
      const item = migrated.get(sourceUrl);
      if (!item || !row.organization_id) continue;
      const { error } = await supabase.from("kiosk_asset_manifest").upsert(
        {
          organization_id: row.organization_id,
          // Keep the legacy source so an older cached kiosk config can resolve
          // the same immutable R2 object and revision after migration.
          source_url: sourceUrl,
          delivery_url: item.deliveryUrl,
          revision: item.revision,
          content_hash: item.contentHash,
          byte_size: item.byteSize,
          content_type: item.contentType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,source_url" },
      );
      if (error) throw error;
    }
  }
  for (const row of assets) {
    const references = collectLegacyUrls(row.url);
    for (const sourceUrl of references) {
      const item = migrated.get(sourceUrl);
      if (!item || !row.organization_id) continue;
      const { error } = await supabase.from("kiosk_asset_manifest").upsert(
        {
          organization_id: row.organization_id,
          source_url: sourceUrl,
          delivery_url: item.deliveryUrl,
          revision: item.revision,
          content_hash: item.contentHash,
          byte_size: item.byteSize,
          content_type: item.contentType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,source_url" },
      );
      if (error) throw error;
    }
  }
  console.log("Database references and manifest updated. Legacy Supabase URLs remain readable for fallback.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
