import { LegalPage } from "@/features/root/legal/legal-page";
import { getLegalDocument } from "@/features/root/legal/legal-content";

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
