import type { Metadata } from "next";
import { LegalPage } from "@/features/root/legal/legal-page";
import { getLegalDocument } from "@/features/root/legal/legal-content";

export const metadata: Metadata = {
  title: "Kebijakan Refund | POSKART",
  description:
    "Kebijakan pengembalian dana POSKART untuk langganan, biaya setup, dan layanan receipt photobooth app.",
  alternates: {
    canonical: "/refund-policy",
  },
};

export default function RefundPolicyPage() {
  const document = getLegalDocument("refund");

  return (
    <LegalPage
      title={document.title}
      description={document.description}
      sections={document.sections}
    />
  );
}
