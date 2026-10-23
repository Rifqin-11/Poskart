// Shared by the visible FAQ and its server-rendered JSON-LD.
export const commonQuestions = [
  {
    question: "Apakah POSKART bisa dicoba gratis?",
    answer:
      "Ya. Trial Starter gratis 14 hari untuk 1 device dan langsung aktif setelah dimulai oleh pemilik organisasi dengan email terverifikasi. Trial hanya bisa digunakan sekali per organisasi dan email. Setelah trial berakhir, pilih paket berbayar untuk melanjutkan operasional booth.",
  },
  {
    question: "Apakah POSKART cocok untuk satu booth?",
    answer:
      "Ya. Paket Starter dibuat untuk satu device, dan Anda bisa menambah kapasitas ketika mulai mengelola booth atau event yang lebih banyak.",
  },
  {
    question: "Perangkat Android apa yang didukung?",
    answer:
      "POSKART direkomendasikan untuk tablet Android 10+ dengan arsitektur ARM64, RAM minimum 4 GB, dan layar 10 inci atau lebih. Secara teknis aplikasi dapat dipasang mulai Android 7 (API 24), tetapi Android 10+ memberikan pengalaman operasional yang lebih stabil.",
  },
  {
    question: "Printer apa yang kompatibel?",
    answer:
      "POSKART mendukung direct printing ke printer thermal USB ESC/POS dengan kertas 58 mm atau 80 mm melalui koneksi USB Host/OTG. Printer lain dapat digunakan jika tersedia melalui Android Print Service atau driver yang kompatibel pada tablet Anda.",
  },
  {
    question: "Apa yang terjadi jika internet mati saat event?",
    answer:
      "Device yang sudah dipasangkan dapat tetap mengambil foto, mencetak hasil, dan menerima pembayaran cash melalui voucher yang tersimpan. Foto akan disimpan dalam antrean dan diupload otomatis setelah koneksi kembali. QRIS, pairing device baru, sinkronisasi konfigurasi, dan halaman download tamu memerlukan internet.",
  },
  {
    question: "Apakah foto pengunjung aman dan tersimpan?",
    answer:
      "Foto pengunjung disimpan di perangkat booth selama event berlangsung, kemudian diupload ke cloud setelah koneksi tersedia. Masa berlaku link download dan periode penyimpanan hasil foto dapat dikonfigurasi sesuai kebijakan operasional Anda.",
  },
  {
    question: "Apakah tersedia QRIS dan cash?",
    answer:
      "POSKART mendukung pembayaran QRIS melalui integrasi payment gateway dan penerimaan cash melalui voucher yang diberikan operator. QRIS memerlukan koneksi internet, sementara alur cash melalui voucher tetap dapat berjalan saat offline.",
  },
  {
    question: "Apakah Showcase termasuk dalam paket?",
    answer:
      "Showcase tersedia untuk semua paket dan dapat digunakan untuk membagikan pilihan frame, theme, serta referensi visual kepada cafe atau calon partner event.",
  },
] as const;
