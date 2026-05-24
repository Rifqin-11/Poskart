import { LegalPage } from "@/components/legal/legal-page";
import { businessProfile } from "@/lib/constants/business";

const sections = [
  {
    title: "1. Ruang Lingkup Refund",
    body: [
      "Kebijakan ini berlaku untuk pembayaran subscription POSKART, setup fee, onboarding fee, dan biaya layanan SaaS lain yang ditagihkan oleh POSKART.",
      "Refund untuk transaksi photobooth end-customer yang diproses oleh merchant/operator booth dapat mengikuti kebijakan merchant/operator terkait, kecuali POSKART bertindak langsung sebagai merchant penjual layanan tersebut.",
    ],
  },
  {
    title: "2. Kondisi Refund Dapat Dipertimbangkan",
    body: [
      "Refund dapat dipertimbangkan jika terjadi pembayaran ganda, kesalahan nominal tagihan, layanan belum diaktifkan, atau terjadi kegagalan teknis yang secara material membuat layanan tidak dapat digunakan.",
      "Permintaan refund wajib menyertakan nama pelanggan, email, nomor kontak, invoice atau transaction ID, tanggal pembayaran, nominal, metode pembayaran, dan alasan refund.",
    ],
  },
  {
    title: "3. Kondisi Refund Dapat Ditolak",
    body: [
      "Refund dapat ditolak jika layanan sudah aktif dan digunakan, periode subscription sudah berjalan, pelanggan melanggar Terms & Conditions, atau permintaan tidak memiliki bukti transaksi yang valid.",
      "Biaya pihak ketiga, MDR, biaya payment gateway, biaya transfer, atau pajak dapat tidak dikembalikan jika penyedia pembayaran tidak mengembalikannya kepada POSKART.",
    ],
  },
  {
    title: "4. Cancellation Subscription",
    body: [
      "Pelanggan dapat mengajukan pembatalan subscription untuk periode berikutnya melalui contact center POSKART.",
      "Pembatalan tidak otomatis mengembalikan biaya periode berjalan, kecuali disepakati tertulis atau memenuhi kondisi refund yang dapat dipertimbangkan.",
    ],
  },
  {
    title: "5. Estimasi Proses",
    body: [
      "POSKART akan meninjau permintaan refund dalam 3-7 hari kerja setelah informasi diterima lengkap.",
      "Jika refund disetujui, proses pengembalian dana mengikuti metode pembayaran dan kebijakan payment gateway atau bank terkait. Estimasi dapat berbeda untuk kartu, e-wallet, QRIS, virtual account, atau transfer bank.",
    ],
  },
  {
    title: "6. Kontak Refund dan Dispute",
    body: [
      `Permintaan refund dan dispute dapat dikirim ke ${businessProfile.email} dengan subjek “Refund Request - [Invoice/Transaction ID]”.`,
      `Untuk bantuan cepat, pelanggan juga dapat menghubungi ${businessProfile.phone} pada jam operasional ${businessProfile.supportHours}.`,
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      description="Kebijakan refund, cancellation, subscription cancellation, estimasi proses, dan kontak dispute POSKART."
      sections={sections}
    />
  );
}
