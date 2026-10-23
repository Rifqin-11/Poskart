import type { Metadata } from "next";

export const SITE_URL = "https://www.poskart.my.id";
export const HOME_TITLE = "Receipt Photobooth App & Software Indonesia | POSKART";
export const HOME_DESCRIPTION =
  "Receipt photobooth app untuk tablet Android. Kelola printer thermal 58/80 mm, frame, QRIS, dan galeri dari dashboard POSKART. Coba gratis 14 hari.";

export const receiptPageLanguages = {
  id: "/software-receipt-photobooth",
  en: "/receipt-photobooth-app",
} as const;

export function publicPageMetadata({
  title,
  description,
  path,
  language = "id",
  languages,
}: {
  title: string;
  description: string;
  path: string;
  language?: "id" | "en";
  languages?: Record<string, string>;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path, ...(languages ? { languages } : {}) },
    openGraph: {
      type: "website",
      siteName: "POSKART",
      title,
      description,
      url: path,
      locale: language === "en" ? "en_US" : "id_ID",
      ...(languages ? { alternateLocale: language === "en" ? "id_ID" : "en_US" } : {}),
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image.png"],
    },
  };
}
