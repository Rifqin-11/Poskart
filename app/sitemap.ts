import type { MetadataRoute } from "next";
import { receiptPageLanguages, SITE_URL } from "@/lib/seo";

/**
 * Only canonical, indexable, stable marketing routes belong here.
 * Private application routes, auth flows, tokenized galleries, queues,
 * and verification pages must stay excluded.
 *
 * `lastModified` is intentionally omitted: stamping the build time on
 * every route sends false freshness signals to crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;

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
    ...Object.values(receiptPageLanguages).map((path) => ({
      url: `${baseUrl}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(receiptPageLanguages).map(([language, route]) => [language, `${baseUrl}${route}`]),
        ),
      },
    })),
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
