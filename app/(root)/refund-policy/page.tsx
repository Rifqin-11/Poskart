import { LegalPage } from "@/features/root/legal/legal-page";
import { getLegalDocument } from "@/features/root/legal/legal-content";

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
