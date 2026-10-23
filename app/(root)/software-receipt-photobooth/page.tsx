import { ReceiptPhotoboothPage } from "@/features/root/receipt-photobooth/receipt-photobooth-page";
import { receiptPhotoboothContent } from "@/features/root/receipt-photobooth/content";
import { publicPageMetadata, receiptPageLanguages } from "@/lib/seo";

const copy = receiptPhotoboothContent.id;
export const metadata = publicPageMetadata({
  title: copy.title,
  description: copy.description,
  path: copy.path,
  language: "id",
  languages: receiptPageLanguages,
});

export default function SoftwareReceiptPhotoboothRoute() {
  return <ReceiptPhotoboothPage language="id" />;
}
