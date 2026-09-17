/**
 * Structured data for POSKART homepage.
 * 
 * Types: Organization, SoftwareApplication
 * This component renders <script type="application/ld+json"> blocks.
 * Ensure all content matches visible page content and is accurate.
 */

export function PoskartStructuredData() {
  const baseUrl = "https://www.poskart.my.id";

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "POSKART",
    alternateName: "POSKART Indonesia",
    url: baseUrl,
    logo: `${baseUrl}/Logo%20Poskart.png`,
    description:
      "Receipt photobooth app untuk mengatur frame, kamera, printer, QRIS, antrean, gallery, dan banyak booth dari satu dashboard.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "ID",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "support@poskart.my.id",
        areaServed: "ID",
        availableLanguage: ["Indonesian"],
      },
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "sales@poskart.my.id",
        areaServed: "ID",
        availableLanguage: ["Indonesian"],
      },
    ],
  };

  const softwareAppData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "POSKART Receipt Photobooth App",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android",
    offers: {
      "@type": "Offer",
      price: "50000",
      priceCurrency: "IDR",
    },
    description:
      "Aplikasi receipt photobooth yang memungkinkan pengguna mengatur tema, frame, pembayaran QRIS, antrean, galeri foto, dan monitoring perangkat dari satu dashboard terpusat.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareAppData)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e"),
        }}
      />
    </>
  );
}
