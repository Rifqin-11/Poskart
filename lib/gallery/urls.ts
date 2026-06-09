import "server-only";

export function getPublicGalleryBaseUrl() {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://poskart.my.id"
  ).replace(/\/+$/, "");

  return `${siteUrl}/s`;
}

export function getPublicGalleryUrl(sessionId: string) {
  return `${getPublicGalleryBaseUrl()}/${encodeURIComponent(sessionId)}`;
}
