import type { Metadata } from "next";
import { LegalPage } from "@/features/root/legal/legal-page";
import { getLegalDocument } from "@/features/root/legal/legal-content";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | POSKART",
  description:
    "Kebijakan privasi POSKART mencakup pengelolaan data booth, foto pengunjung, dan informasi akun pengguna.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  const document = getLegalDocument("privacy");

  return (
    <LegalPage
      title={document.title}
      description={document.description}
      sections={document.sections}
    />
  );
}
