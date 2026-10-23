import { SITE_URL } from "@/lib/seo";

export type PublicFAQ = { question: string; answer: string };

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export function productPageStructuredData({
  path,
  title,
  description,
  language,
  faqs,
}: {
  path: string;
  title: string;
  description: string;
  language: "id" | "en";
  faqs: readonly PublicFAQ[];
}) {
  const url = new URL(path, SITE_URL).href;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "POSKART",
        alternateName: "POSKART Indonesia",
        url: SITE_URL,
        logo: `${SITE_URL}/logo-mark.webp`,
        email: "support@poskart.my.id",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: "POSKART Receipt Photobooth App",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Android",
        description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        screenshot: `${SITE_URL}/landing/booth-camera.webp`,
        installUrl: `${SITE_URL}/download`,
        // A time-limited trial, not a claim that the paid product is free.
        // The same offer and restrictions are visible in the page's FAQ.
        offers: {
          "@type": "Offer",
          name: language === "en" ? "14-day Starter trial" : "Trial Starter 14 hari",
          description: language === "en"
            ? "Free for 14 days on 1 device. Once per organization and email. A paid subscription is required afterwards."
            : "Gratis 14 hari untuk 1 device. Sekali per organisasi dan email. Setelahnya perlu paket berbayar.",
          price: "0",
          priceCurrency: "IDR",
          eligibleDuration: { "@type": "QuantitativeValue", value: 14, unitCode: "DAY" },
          url: `${SITE_URL}/register`,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: language,
        about: { "@id": `${SITE_URL}/#software` },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      // FAQ markup describes visible content; it does not promise Google rich results.
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        url: `${url}#faq`,
        inLanguage: language,
        mainEntity: faqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
      ...(path === "/" ? [] : [{
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "POSKART", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: title, item: url },
        ],
      }]),
    ],
  };
}
