import { verifyRole } from "@/server/admin/context";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeApiError } from "@/lib/http/safe-api-error";
import { parseMusicUrl } from "@/lib/music/embed";
import { resolveMusicTitle } from "@/lib/music/oembed";

export const runtime = "nodejs";

/**
 * Looks up the real song title for a builder music link.
 *
 * Runs server-side because the provider oEmbed endpoints do not send CORS
 * headers. The URL is validated by `parseMusicUrl` first, so only known music
 * hosts are ever fetched.
 */
export async function POST(request: Request) {
  try {
    const { user } = await verifyRole(["owner", "admin", "designer"]);

    const limit = await checkRateLimit(`music-title:${user.id}`, 60, 30);
    if (!limit.allowed) return limit.response;

    const body = (await request.json().catch(() => null)) as {
      url?: string;
    } | null;

    const url = body?.url?.trim() ?? "";
    const parsed = parseMusicUrl(url);
    if (!parsed) {
      return Response.json(
        { message: "Link musik tidak didukung." },
        { status: 400 },
      );
    }

    return Response.json({
      provider: parsed.provider,
      title: await resolveMusicTitle(url),
    });
  } catch (error) {
    return safeApiError(error, {
      context: "api/admin/music-title",
      message: "Judul lagu belum dapat diambil.",
    });
  }
}
