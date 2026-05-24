import { LegalPage } from "@/components/legal/legal-page";
import { businessProfile } from "@/lib/constants/business";

const sections = [
  {
    title: "1. Data yang Dikumpulkan",
    body: [
      "POSKART dapat mengumpulkan data akun seperti nama, email, nomor telepon, role pengguna, nama bisnis, alamat bisnis, dan informasi tenant.",
      "POSKART juga dapat memproses data operasional seperti data booth, template, layout schema, pricing, transaksi, status pembayaran, media foto, download link, logs, dan analytics.",
    ],
  },
  {
    title: "2. Tujuan Pemrosesan Data",
    body: [
      "Data digunakan untuk menyediakan layanan dashboard, visual builder, monitoring transaksi QRIS, pengelolaan booth, support pelanggan, billing, keamanan, audit, dan peningkatan layanan.",
      "Data transaksi digunakan untuk rekonsiliasi pembayaran, status settlement, refund, dispute handling, dan pelaporan internal.",
    ],
  },
  {
    title: "3. Media Foto dan Asset",
    body: [
      "Media yang diunggah atau dibuat melalui booth dapat disimpan untuk kebutuhan preview, download customer, template, dan pengelolaan asset sesuai konfigurasi retention yang berlaku.",
      "Pengguna bertanggung jawab memastikan customer photobooth mengetahui dan menyetujui penggunaan media sesuai kebutuhan event atau layanan.",
    ],
  },
  {
    title: "4. Pihak Ketiga",
    body: [
      "POSKART dapat menggunakan penyedia pihak ketiga seperti payment gateway, Supabase, storage provider, email provider, analytics, atau infrastruktur cloud untuk menjalankan layanan.",
      "Data yang diproses oleh pihak ketiga tunduk pada kebijakan privasi dan keamanan masing-masing penyedia.",
    ],
  },
  {
    title: "5. Keamanan dan Retensi",
    body: [
      "POSKART menerapkan pembatasan akses, konfigurasi role, dan praktik keamanan aplikasi untuk melindungi data dari akses tidak sah.",
      "Data disimpan selama diperlukan untuk operasional, kepatuhan hukum, penyelesaian transaksi, audit, atau sampai pengguna meminta penghapusan sesuai ketentuan yang berlaku.",
    ],
  },
  {
    title: "6. Hak Pengguna dan Kontak",
    body: [
      `Pengguna dapat menghubungi ${businessProfile.email} untuk permintaan akses, koreksi, atau penghapusan data yang berada dalam kendali POSKART.`,
      "Permintaan dapat memerlukan verifikasi identitas dan wewenang pengguna sebelum diproses.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="Kebijakan privasi POSKART terkait data akun, transaksi, media foto, penyimpanan data, payment gateway, dan pihak ketiga."
      sections={sections}
    />
  );
}
