import { commonQuestions } from "@/features/root/home/landing-faq-content";
import { HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo";
import { productPageStructuredData, serializeJsonLd } from "@/lib/seo-structured-data";

export function PoskartStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(productPageStructuredData({
          path: "/",
          title: HOME_TITLE,
          description: HOME_DESCRIPTION,
          language: "id",
          faqs: commonQuestions,
        })),
      }}
    />
  );
}
