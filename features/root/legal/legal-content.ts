import { businessProfile } from "@/lib/constants/business";

export type LegalDocument = {
  key: "privacy" | "refund" | "terms";
  title: string;
  description: string;
  sections: {
    title: string;
    body: string[];
  }[];
};

export const legalDocuments = [
  {
    key: "privacy",
    title: "Privacy Policy",
    description:
      "Kebijakan privasi POSKART terkait data akun, transaksi, media foto, penyimpanan data, payment gateway, dan pihak ketiga.",
    sections: [
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
    ],
  },
  {
    key: "refund",
    title: "Refund & Cancellation Policy",
    description:
      "Kebijakan refund, cancellation, subscription cancellation, estimasi proses, dan kontak dispute POSKART.",
    sections: [
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
          `Permintaan refund dan dispute dapat dikirim ke ${businessProfile.email} dengan subjek "Refund Request - [Invoice/Transaction ID]".`,
          `Untuk bantuan cepat, pelanggan juga dapat menghubungi ${businessProfile.phone} pada jam operasional ${businessProfile.supportHours}.`,
        ],
      },
    ],
  },
  {
    key: "terms",
    title: "Terms & Conditions",
    description:
      "Syarat penggunaan layanan POSKART untuk akun, subscription, pembayaran, batasan penggunaan, dan tanggung jawab pengguna.",
    sections: [
      {
        title: "1. Layanan POSKART",
        body: [
          `${businessProfile.brandName} menyediakan platform SaaS untuk membantu operator photobooth mengelola kiosk, visual layout, template, pricing, QRIS transaction monitoring, booth device management, analytics, dan tenant management.`,
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
          `Subscription POSKART tersedia dalam paket Starter, Growth, dan Business dengan pilihan 1 bulan, 3 bulan, 6 bulan, dan 12 bulan. Device tambahan ditagihkan per device per bulan. ${businessProfile.taxNote}`,
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
    ],
  },
] satisfies LegalDocument[];

export function getLegalDocument(key: LegalDocument["key"]) {
  return legalDocuments.find((document) => document.key === key) ?? legalDocuments[0];
}
