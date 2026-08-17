import "server-only";

import { parseMusicUrl, type MusicEmbedProvider } from "@/lib/music/embed";

/**
 * Resolves the real song title from the provider's public oEmbed endpoint.
 *
 * All endpoints are free and keyless. Apple Music has no oEmbed endpoint, so
 * its title is derived from the URL slug instead.
 */

const OEMBED_TIMEOUT_MS = 6000;
const MAX_TITLE_LENGTH = 80;

const OEMBED_ENDPOINTS: Partial<Record<MusicEmbedProvider, string>> = {
  spotify: "https://open.spotify.com/oembed",
  youtube: "https://www.youtube.com/oembed",
  soundcloud: "https://soundcloud.com/oembed",
};

function buildOEmbedUrl(provider: MusicEmbedProvider, target: string) {
  const endpoint = OEMBED_ENDPOINTS[provider];
  if (!endpoint) return null;

  const url = new URL(endpoint);
  url.searchParams.set("url", target);
  url.searchParams.set("format", "json");
  return url.toString();
}

/** "Headlines (Explicit Version) by octobersveryown" -> drops the trailing by-line. */
function stripSoundCloudAuthor(title: string) {
  return title.replace(/\s+by\s+[^\s].*$/i, "").trim() || title;
}

/** music.apple.com/id/album/blinding-lights/123 -> "Blinding Lights" */
function titleFromAppleUrl(rawUrl: string) {
  try {
    const segments = new URL(rawUrl).pathname.split("/").filter(Boolean);
    // [storefront, kind, slug, id]
    const slug = segments[2];
    if (!slug) return "";
    return slug
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

export async function resolveMusicTitle(rawUrl: string): Promise<string> {
  const parsed = parseMusicUrl(rawUrl);
  if (!parsed) return "";

  if (parsed.provider === "applemusic") {
    return titleFromAppleUrl(rawUrl).slice(0, MAX_TITLE_LENGTH);
  }

  const endpoint = buildOEmbedUrl(parsed.provider, rawUrl.trim());
  if (!endpoint) return "";

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS),
      headers: { accept: "application/json" },
      // Titles are stable; let the platform cache them for a day.
      next: { revalidate: 86400 },
    });
    if (!response.ok) return "";

    const payload = (await response.json()) as { title?: unknown };
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) return "";

    const cleaned =
      parsed.provider === "soundcloud" ? stripSoundCloudAuthor(title) : title;

    return cleaned.slice(0, MAX_TITLE_LENGTH);
  } catch {
    // Network/timeout/parse failure just means no auto-title.
    return "";
  }
}
