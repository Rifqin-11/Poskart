import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/lib/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Metadata } from "next";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_URL } from "@/lib/seo";

export const metadataBase = new URL(SITE_URL);

export const metadata: Metadata = {
  metadataBase,
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  authors: [{ name: "POSKART Indonesia" }],
  applicationName: "POSKART",
  creator: "POSKART Indonesia",
  publisher: "POSKART Indonesia",
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "POSKART",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Receipt Photobooth App Indonesia - POSKART",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/opengraph-image.png"],
    creator: "@poskart_id",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-zinc-950 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
