/**
 * Music embed parsing for the frame builder -> shared gallery result page.
 *
 * Only free, official embed players are supported. Every URL is parsed into a
 * strict provider + resource identifier so the result page never renders an
 * attacker-controlled iframe `src`.
 */

export const MUSIC_EMBED_PROVIDERS = [
  "spotify",
  "youtube",
  "applemusic",
  "soundcloud",
] as const;

export type MusicEmbedProvider = (typeof MUSIC_EMBED_PROVIDERS)[number];

/** Persisted on `FrameLayout.music` and rendered on /s/[sessionId]. */
export type MusicEmbed = {
  enabled: boolean;
  /** Original URL the operator pasted - kept so the builder can show it back. */
  url: string;
  provider: MusicEmbedProvider | null;
  /** Provider-safe iframe URL, rebuilt from parsed parts (never raw input). */
  embedUrl: string | null;
  /** Optional label shown above the player. */
  title: string;
  /** Compact players save vertical space on the result page. */
  compact: boolean;
};

export const MUSIC_EMBED_PROVIDER_LABELS: Record<MusicEmbedProvider, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  applemusic: "Apple Music",
  soundcloud: "SoundCloud",
};

export const EMPTY_MUSIC_EMBED: MusicEmbed = {
  enabled: false,
  url: "",
  provider: null,
  embedUrl: null,
  title: "",
  compact: false,
};

const SPOTIFY_TYPES = new Set([
  "track",
  "album",
  "playlist",
  "artist",
  "episode",
  "show",
]);

const SPOTIFY_ID = /^[A-Za-z0-9]{16,32}$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_LIST_ID = /^[A-Za-z0-9_-]{12,64}$/;
const APPLE_STOREFRONT = /^[a-z]{2}$/;
const SAFE_PATH_SEGMENT = /^[A-Za-z0-9._~-]{1,120}$/;
const APPLE_NUMERIC_ID = /^[0-9]{1,20}$/;

function safeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function pathSegments(url: URL) {
  return url.pathname.split("/").filter(Boolean);
}

function hostMatches(url: URL, ...hosts: string[]) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return hosts.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

/** open.spotify.com/track/<id> - /intl-id/track/<id> - spotify:track:<id> */
function parseSpotify(raw: string, url: URL | null): string | null {
  const uriMatch = /^spotify:([a-z]+):([A-Za-z0-9]+)$/.exec(raw.trim());
  if (uriMatch) {
    const [, type, id] = uriMatch;
    if (!SPOTIFY_TYPES.has(type) || !SPOTIFY_ID.test(id)) return null;
    return `https://open.spotify.com/embed/${type}/${id}`;
  }

  if (!url || !hostMatches(url, "spotify.com")) return null;

  const segments = pathSegments(url).filter(
    (segment) => segment !== "embed" && !segment.startsWith("intl-"),
  );
  const [type, id] = segments;
  if (!type || !id) return null;
  if (!SPOTIFY_TYPES.has(type) || !SPOTIFY_ID.test(id)) return null;

  return `https://open.spotify.com/embed/${type}/${id}`;
}

/** youtube.com/watch?v= - youtu.be/<id> - /playlist?list= - music.youtube.com */
function parseYouTube(url: URL | null): string | null {
  if (!url) return null;
  if (!hostMatches(url, "youtube.com", "youtu.be", "youtube-nocookie.com")) {
    return null;
  }

  const segments = pathSegments(url);
  const listId = url.searchParams.get("list") ?? "";

  let videoId = "";
  if (hostMatches(url, "youtu.be")) {
    videoId = segments[0] ?? "";
  } else if (segments[0] === "watch") {
    videoId = url.searchParams.get("v") ?? "";
  } else if (segments[0] === "embed" || segments[0] === "shorts") {
    videoId = segments[1] ?? "";
  }

  if (videoId && YOUTUBE_ID.test(videoId)) {
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    if (listId && YOUTUBE_LIST_ID.test(listId)) {
      embed.searchParams.set("list", listId);
    }
    return embed.toString();
  }

  if (listId && YOUTUBE_LIST_ID.test(listId)) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}`;
  }

  return null;
}

/** music.apple.com/<storefront>/album/<slug>/<id>?i=<trackId> */
function parseAppleMusic(url: URL | null): string | null {
  if (!url || !hostMatches(url, "music.apple.com")) return null;

  const segments = pathSegments(url);
  const [storefront, ...rest] = segments;
  if (!storefront || !APPLE_STOREFRONT.test(storefront)) return null;
  if (rest.length < 2) return null;
  if (!rest.every((segment) => SAFE_PATH_SEGMENT.test(segment))) return null;
  if (!["album", "playlist", "song", "artist"].includes(rest[0])) return null;

  const embed = new URL(
    `https://embed.music.apple.com/${storefront}/${rest.join("/")}`,
  );
  const trackId = url.searchParams.get("i") ?? "";
  if (trackId && APPLE_NUMERIC_ID.test(trackId)) {
    embed.searchParams.set("i", trackId);
  }
  return embed.toString();
}

/** soundcloud.com/<artist>/<track> - the widget resolves the permalink. */
function parseSoundCloud(url: URL | null): string | null {
  if (!url || !hostMatches(url, "soundcloud.com")) return null;

  const segments = pathSegments(url);
  if (segments.length < 2) return null;
  if (!segments.every((segment) => SAFE_PATH_SEGMENT.test(segment))) return null;

  const embed = new URL("https://w.soundcloud.com/player/");
  embed.searchParams.set("url", `https://soundcloud.com/${segments.join("/")}`);
  embed.searchParams.set("color", "#18181b");
  embed.searchParams.set("hide_related", "true");
  embed.searchParams.set("show_comments", "false");
  embed.searchParams.set("show_teaser", "false");
  return embed.toString();
}

export type ParsedMusicEmbed = {
  provider: MusicEmbedProvider;
  embedUrl: string;
};

/** Returns a provider-safe embed URL, or null when the link is unsupported. */
export function parseMusicUrl(input: string): ParsedMusicEmbed | null {
  const raw = input.trim();
  if (!raw) return null;

  const url = safeUrl(raw);

  const spotify = parseSpotify(raw, url);
  if (spotify) return { provider: "spotify", embedUrl: spotify };

  const youtube = parseYouTube(url);
  if (youtube) return { provider: "youtube", embedUrl: youtube };

  const apple = parseAppleMusic(url);
  if (apple) return { provider: "applemusic", embedUrl: apple };

  const soundcloud = parseSoundCloud(url);
  if (soundcloud) return { provider: "soundcloud", embedUrl: soundcloud };

  return null;
}

/**
 * Normalises stored/incoming music config. The embed URL is always recomputed
 * from the source URL so a tampered `embedUrl` in the JSONB column is ignored.
 */
export function normalizeMusicEmbed(value: unknown): MusicEmbed {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_MUSIC_EMBED };
  }

  const record = value as Record<string, unknown>;
  const url =
    typeof record.url === "string" ? record.url.trim().slice(0, 600) : "";
  const parsed = parseMusicUrl(url);
  const title =
    typeof record.title === "string" ? record.title.trim().slice(0, 80) : "";

  return {
    enabled: record.enabled === true && Boolean(parsed),
    url,
    provider: parsed?.provider ?? null,
    embedUrl: parsed?.embedUrl ?? null,
    title,
    compact: record.compact === true,
  };
}

/** Only returns a player when the frame actually has a usable embed. */
export function getPlayableMusicEmbed(value: unknown): MusicEmbed | null {
  const music = normalizeMusicEmbed(value);
  return music.enabled && music.embedUrl ? music : null;
}

/** Default iframe height per provider (px). */
export function getMusicEmbedHeight(music: MusicEmbed) {
  switch (music.provider) {
    case "spotify":
      return music.compact ? 152 : 352;
    case "youtube":
      return music.compact ? 200 : 315;
    case "applemusic":
      return music.compact ? 175 : 450;
    case "soundcloud":
      return music.compact ? 166 : 300;
    default:
      return 180;
  }
}
