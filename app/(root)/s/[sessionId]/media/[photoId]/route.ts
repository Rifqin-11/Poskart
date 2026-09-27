import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getGalleryRetentionConfig,
  isGalleryLinkExpired,
} from "@/lib/gallery/retention";

export const runtime = "nodejs";

const FORWARDED_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

export async function GET(
  request: Request,
  context: RouteContext<"/s/[sessionId]/media/[photoId]">,
) {
  const { sessionId, photoId } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { data: session } = await supabase
    .from("gallery_sessions")
    .select("created_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return new Response("Gallery session not found.", { status: 404 });
  }

  const { linkExpiryHours } = await getGalleryRetentionConfig();
  if (isGalleryLinkExpired(session.created_at, linkExpiryHours)) {
    return new Response("Gallery link has expired.", { status: 410 });
  }

  const { data: photo } = await supabase
    .from("gallery_photos")
    .select("secure_url")
    .eq("id", photoId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!photo?.secure_url) {
    return new Response("Photo not found.", { status: 404 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(photo.secure_url);
  } catch {
    return new Response("Photo URL is invalid.", { status: 502 });
  }

  if (sourceUrl.protocol !== "https:") {
    return new Response("Photo URL is not secure.", { status: 502 });
  }

  const range = request.headers.get("range");
  const upstream = await fetch(sourceUrl, {
    cache: "no-store",
    headers: range ? { Range: range } : undefined,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Photo could not be loaded.", { status: 502 });
  }

  const headers = new Headers();
  for (const header of FORWARDED_HEADERS) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
