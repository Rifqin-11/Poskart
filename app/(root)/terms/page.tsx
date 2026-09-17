import type { Metadata } from "next";
import { LegalPage } from "@/features/root/legal/legal-page";
import { getLegalDocument } from "@/features/root/legal/legal-content";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | POSKART",
  description:
    "Syarat dan ketentuan penggunaan layanan dan aplikasi receipt photobooth POSKART.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  const document = getLegalDocument("terms");

  return (
    <LegalPage
      title={document.title}
      description={document.description}
      sections={document.sections}
    />
  );
}
