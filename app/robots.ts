import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/builder",
          "/login",
          "/register",
          "/checkout",
          "/onboarding",
          "/verify",
          "/g/",
          "/s/",
          "/showcase/",
          "/q/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.poskart.my.id/sitemap.xml",
  };
}
