import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getGalleryRetentionConfig,
  isGalleryLinkExpired,
} from "@/lib/gallery/retention";

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

export async function GET(
  _request: Request,
  context: RouteContext<"/s/[sessionId]/download/[photoId]">,
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
    .select("kind,photo_index,secure_url,format")
    .eq("id", photoId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!photo) {
    return new Response("Photo not found.", { status: 404 });
  }

  const cloudinaryResponse = await fetch(photo.secure_url, {
    cache: "no-store",
  });
  if (!cloudinaryResponse.ok || !cloudinaryResponse.body) {
    return new Response("Photo could not be downloaded.", { status: 502 });
  }

  const extension = safeFilename(photo.format || "jpg");
  const label =
    photo.kind === "framed" && photo.photo_index === 1
      ? "poskart-live-photo"
      : photo.kind === "framed"
        ? "poskart-framed"
        : photo.photo_index === 98
          ? "poskart-gif"
          : `poskart-raw-${photo.photo_index + 1}`;

  return new Response(cloudinaryResponse.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${label}.${extension}"`,
      "Content-Type":
        cloudinaryResponse.headers.get("content-type") ?? "image/jpeg",
    },
  });
}
