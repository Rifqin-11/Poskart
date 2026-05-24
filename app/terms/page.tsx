import { LegalPage } from "@/components/legal/legal-page";
import { businessProfile } from "@/lib/constants/business";

const sections = [
  {
    title: "1. Layanan POSKART",
    body: [
      `${businessProfile.brandName} menyediakan platform SaaS untuk membantu operator photobooth mengelola kiosk, visual layout, template, pricing, media assets, QRIS transaction monitoring, booth device management, analytics, dan tenant management.`,
      "Layanan POSKART ditujukan untuk pengguna bisnis seperti operator photobooth, event organizer, franchise, brand activation team, dan pihak lain yang membutuhkan sistem operasional booth.",
    ],
  },
  {
    title: "2. Akun dan Akses Admin",
    body: [
      "Pengguna bertanggung jawab menjaga keamanan akun, akses staff, password, dan konfigurasi yang dibuat melalui dashboard POSKART.",
      "POSKART dapat membatasi atau menangguhkan akses jika terdapat indikasi penyalahgunaan, pelanggaran hukum, aktivitas fraud, atau pelanggaran ketentuan layanan.",
    ],
  },
  {
    title: "3. Subscription dan Pembayaran",
    body: [
      `Subscription POSKART tersedia dalam pilihan 1 bulan, 3 bulan, 6 bulan, dan 1 tahun untuk 1 device. Device tambahan ditagihkan per device per bulan. ${businessProfile.taxNote}`,
      "Pembayaran subscription dilakukan melalui invoice, payment link, transfer, atau metode pembayaran resmi lain yang disediakan POSKART.",
      "Akses layanan dapat dihentikan sementara jika invoice jatuh tempo tidak dibayar sesuai periode yang tercantum pada invoice atau kontrak.",
    ],
  },
  {
    title: "4. Penggunaan yang Dilarang",
    body: [
      "Pengguna tidak diperbolehkan memakai POSKART untuk aktivitas ilegal, penipuan, pelanggaran hak kekayaan intelektual, penyalahgunaan data pribadi, atau konten yang melanggar hukum yang berlaku.",
      "Pengguna bertanggung jawab atas konten, template, gambar, logo, dan media yang diunggah ke platform.",
    ],
  },
  {
    title: "5. Ketersediaan Layanan",
    body: [
      "POSKART berupaya menjaga layanan tetap tersedia, tetapi downtime dapat terjadi karena maintenance, gangguan penyedia infrastruktur, integrasi pihak ketiga, atau keadaan di luar kendali POSKART.",
      "Fitur yang menggunakan payment gateway, storage, database, dan realtime service dapat tunduk pada kebijakan dan ketersediaan penyedia layanan masing-masing.",
    ],
  },
  {
    title: "6. Perubahan Ketentuan",
    body: [
      "POSKART dapat memperbarui Terms & Conditions ini dari waktu ke waktu untuk menyesuaikan perubahan layanan, hukum, atau kebutuhan operasional.",
      "Versi terbaru akan dipublikasikan pada halaman ini dan berlaku sejak tanggal pembaruan.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description="Syarat penggunaan layanan POSKART untuk akun, subscription, pembayaran, batasan penggunaan, dan tanggung jawab pengguna."
      sections={sections}
    />
  );
}
