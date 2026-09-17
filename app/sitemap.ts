import type { MetadataRoute } from "next";

/**
 * Only canonical, indexable, stable marketing routes belong here.
 * Private application routes, auth flows, tokenized galleries, queues,
 * and verification pages must stay excluded.
 *
 * `lastModified` is intentionally omitted: stamping the build time on
 * every route sends false freshness signals to crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.poskart.my.id";

  const publicRoutes = [
    {
      url: baseUrl,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/download`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund-policy`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];

  return publicRoutes;
}
