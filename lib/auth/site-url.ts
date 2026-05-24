import { headers } from "next/headers";

/**
 * Resolve the canonical public origin for this deployment.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL  (set this in production, e.g. https://poskart.my.id)
 *   2. VERCEL_URL            (auto-injected on Vercel preview/prod)
 *   3. Forwarded headers     (x-forwarded-proto + x-forwarded-host) — works behind
 *      Cloudflare / Nginx / Vercel where `origin` may be missing or wrong.
 *   4. Request `host` header
 *   5. http://localhost:3000  (last resort, dev only)
 */
export async function getSiteUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return stripTrailingSlash(`https://${vercel}`);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  if (host) return stripTrailingSlash(`${proto}://${host}`);

  const origin = h.get("origin");
  if (origin) return stripTrailingSlash(origin);

  return "http://localhost:3000";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
