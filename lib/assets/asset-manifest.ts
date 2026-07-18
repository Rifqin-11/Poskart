import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type KioskAssetManifestEntry = {
  source_url: string;
  delivery_url: string;
  revision: string;
  content_hash: string | null;
  byte_size: number | null;
  content_type: string | null;
  updated_at: string;
};

const LEGACY_STORAGE_MARKER = "/storage/v1/object/public/builder-assets/";

function isAssetUrl(value: string) {
  const normalized = value.trim();
  if (!/^https?:\/\//i.test(normalized)) return false;
  return (
    normalized.includes(LEGACY_STORAGE_MARKER) ||
    normalized.startsWith("https://assets.poskart.my.id/")
  );
}

export function collectAssetUrls(value: unknown): string[] {
  const urls = new Set<string>();

  const visit = (current: unknown) => {
    if (typeof current === "string") {
      const normalized = current.trim();
      if (isAssetUrl(normalized)) urls.add(normalized);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current && typeof current === "object") {
      Object.values(current).forEach(visit);
    }
  };

  visit(value);
  return Array.from(urls);
}

export function applyAssetManifestDeliveryUrls<T>(
  value: T,
  manifest: KioskAssetManifestEntry[],
): T {
  if (manifest.length === 0) return value;
  const deliveryBySource = new Map(
    manifest.map((entry) => [entry.source_url, entry.delivery_url]),
  );

  const visit = (current: unknown): unknown => {
    if (typeof current === "string") {
      return deliveryBySource.get(current.trim()) ?? current;
    }
    if (Array.isArray(current)) return current.map(visit);
    if (current && typeof current === "object") {
      return Object.fromEntries(
        Object.entries(current).map(([key, item]) => [key, visit(item)]),
      );
    }
    return current;
  };

  return visit(value) as T;
}

export async function recordKioskAssetManifest(input: {
  organizationId: string;
  sourceUrl: string;
  deliveryUrl: string;
  revision: string;
  contentHash?: string | null;
  byteSize?: number | null;
  contentType?: string | null;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("kiosk_asset_manifest").upsert(
      {
        organization_id: input.organizationId,
        source_url: input.sourceUrl,
        delivery_url: input.deliveryUrl,
        revision: input.revision,
        content_hash: input.contentHash ?? null,
        byte_size: input.byteSize ?? null,
        content_type: input.contentType ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,source_url" },
    );
    if (error && error.code !== "42P01") {
      throw new Error(error.message);
    }
  } catch (error) {
    // Keep the asset upload usable before the manifest migration is applied.
    if (error instanceof Error && !error.message.includes("kiosk_asset_manifest")) {
      console.error("[asset-manifest] unable to record asset", error);
    }
  }
}

export async function getKioskAssetManifest(
  organizationId: string,
  references: string[],
): Promise<KioskAssetManifestEntry[]> {
  if (references.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const columns =
    "source_url,delivery_url,revision,content_hash,byte_size,content_type,updated_at";
  const [sourceResult, deliveryResult] = await Promise.all([
    supabase
      .from("kiosk_asset_manifest")
      .select(columns)
      .eq("organization_id", organizationId)
      .in("source_url", references),
    supabase
      .from("kiosk_asset_manifest")
      .select(columns)
      .eq("organization_id", organizationId)
      .in("delivery_url", references),
  ]);

  for (const result of [sourceResult, deliveryResult]) {
    if (!result.error) continue;
    if (result.error.code === "42P01") return [];
    throw new Error(
      `Unable to load kiosk asset manifest: ${result.error.message}`,
    );
  }

  const entries = new Map<string, KioskAssetManifestEntry>();
  for (const row of [
    ...(sourceResult.data ?? []),
    ...(deliveryResult.data ?? []),
  ] as KioskAssetManifestEntry[]) {
    entries.set(row.source_url, row);
  }
  return Array.from(entries.values());
}
