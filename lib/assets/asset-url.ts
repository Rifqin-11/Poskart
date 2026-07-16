type AssetMetadata = {
  deliveryUrl?: unknown;
  delivery_url?: unknown;
  sourceUrl?: unknown;
  source_url?: unknown;
  url?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Asset migrations may leave either a URL, a JSON-encoded metadata object, or
 * the metadata object itself in the schema. Keep those formats readable while
 * old rows are still being used.
 */
export function normalizeAssetUrl(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;

    if (
      (normalized.startsWith("{") && normalized.endsWith("}")) ||
      (normalized.startsWith("[") && normalized.endsWith("]"))
    ) {
      try {
        return normalizeAssetUrl(JSON.parse(normalized));
      } catch {
        return normalized;
      }
    }

    return normalized;
  }

  if (!isRecord(value)) return null;

  const metadata = value as AssetMetadata;
  for (const candidate of [
    metadata.deliveryUrl,
    metadata.delivery_url,
    metadata.url,
    metadata.sourceUrl,
    metadata.source_url,
  ]) {
    const normalized = normalizeAssetUrl(candidate);
    if (normalized) return normalized;
  }

  return null;
}

export function normalizeAssetReferences<T>(value: T): T {
  if (typeof value === "string") {
    return (normalizeAssetUrl(value) ?? value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeAssetReferences(item)) as T;
  }

  if (isRecord(value)) {
    const directAssetUrl = normalizeAssetUrl(value);
    if (directAssetUrl) return directAssetUrl as T;

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeAssetReferences(item),
      ]),
    ) as T;
  }

  return value;
}
