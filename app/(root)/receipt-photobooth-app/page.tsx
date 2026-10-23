import { ReceiptPhotoboothPage } from "@/features/root/receipt-photobooth/receipt-photobooth-page";
import { receiptPhotoboothContent } from "@/features/root/receipt-photobooth/content";
import { publicPageMetadata, receiptPageLanguages } from "@/lib/seo";

const copy = receiptPhotoboothContent.en;
export const metadata = publicPageMetadata({
  title: copy.title,
  description: copy.description,
  path: copy.path,
  language: "en",
  languages: receiptPageLanguages,
});

export default function ReceiptPhotoboothAppRoute() {
  return <ReceiptPhotoboothPage language="en" />;
}
