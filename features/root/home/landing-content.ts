export const landingAssets = {
  hero: {
    src: "/Admin/Dashboard.png",
    alt: "Dashboard admin POSKART untuk mengelola operasional photobooth",
  },
  builder: {
    src: "/Admin/Frames.png",
    alt: "Halaman pengelolaan frame photobooth POSKART",
  },
  operations: {
    src: "/Admin/Queue.png",
    alt: "Halaman antrean sesi photobooth POSKART",
  },
  delivery: {
    src: "/Admin/Settings.png",
    alt: "Halaman pengaturan POSKART",
  },
  Pairing: {
    src: "/Admin/DevicesPair.png",
    alt: "Halaman pengaturan POSKART",
  },
  showcase: {
    src: "/Admin/Showcase.png",
    alt: "Halaman pengelolaan showcase POSKART",
  },
  boothApp: {
    src: "/App/Camera.png",
    alt: "Aplikasi Flutter POSKART yang berjalan di perangkat booth",
  },
  customerDelivery: {
    src: "/iPhone 13 Pro.png",
    alt: "Pengalaman pengunjung membuka hasil foto dari ponsel",
  },
  AppSettings: {
    src: "/App/Settings.png",
    alt: "Pengalaman pengunjung membuka hasil foto dari ponsel",
  },
} as const;

export const heroWorkspacePreviews = [
  {
    id: "dashboard",
    label: "Dashboard",
    url: "poskart.my.id/dashboard",
    image: landingAssets.hero,
    description: "Kelola operasional receipt photobooth dari satu workspace.",
  },
  {
    id: "builder",
    label: "Visual Builder",
    url: "poskart.my.id/builder",
    image: landingAssets.builder,
    description:
      "Atur layar booth, frame, dan alur pengalaman tanpa mengubah kode.",
  },

  {
    id: "monitoring",
    label: "Monitoring Booth",
    url: "poskart.my.id/devices",
    image: {
      src: "/Admin/Devices.png",
      alt: "Halaman monitoring device photobooth POSKART",
    },
    description:
      "Pantau device, printer, lokasi, dan status booth yang sedang berjalan.",
  },
  {
    id: "download",
    label: "Halaman Download",
    url: "poskart.my.id/galery",
    image: landingAssets.delivery,
    description:
      "Buat halaman download yang tetap membawa identitas brand Anda.",
  },
  {
    id: "showcase",
    label: "Showcase",
    url: "poskart.my.id/showcase",
    image: landingAssets.showcase,
    description:
      "Bagikan pilihan visual booth kepada cafe dan calon partner event.",
  },
] as const;

/* Replace only these paths when the final product screenshots are ready. */
export const landingPlaceholderNotes = {
  hero: "Replace with a focused dashboard screenshot that shows several booths.",
  builder: "Replace with the final builder and gallery branding screenshots.",
  operations: "Replace with the queue and QRIS/cash workflow screenshots.",
  delivery: "Replace with the branded customer download page screenshot.",
  showcase: "Replace with the public showcase page shared with cafe or event partners.",
} as const;

export const landingContent = {
  hero: {
    eyebrow: "Software receipt photobooth",
    title: "Photobooth sesuai brand Anda.",
    description:
      "Sesuaikan layar booth, frame, dan halaman download. Kelola operasionalnya dari satu dashboard.",
  },
  stories: [
    {
      number: "01",
      eyebrow: "Setup booth",
      title: "Siapkan aplikasi langsung dari perangkat booth.",
      description:
        "Hubungkan device, pilih konfigurasi event, lalu atur kamera dan printer dari aplikasi Flutter POSKART.",
      points: ["Pairing device", "Pengaturan kamera dan printer", "Konfigurasi khusus per booth"],
      asset: landingAssets.Pairing,
    },
    {
      number: "02",
      eyebrow: "Run sessions",
      title: "Jalankan seluruh sesi dari aplikasi booth.",
      description:
        "Operator menangani antrean, pembayaran, pengambilan foto, preview, dan cetak tanpa berpindah aplikasi.",
      points: ["QRIS dan cash", "Kamera, preview, dan retake", "Antrean dan print flow"],
      asset: landingAssets.operations,
    },
    {
      number: "03",
      eyebrow: "Stay online",
      title: "Jaga setiap booth tetap siap digunakan.",
      description:
        "Pantau koneksi aplikasi, versi, lokasi, serta kondisi perangkat dari Admin Web ketika event sedang berjalan.",
      points: ["Status aplikasi Flutter", "Kondisi device dan printer", "Kontrol dan sinkronisasi jarak jauh"],
      asset: {
        src: "/Admin/Devices.png",
        alt: "Admin Web POSKART untuk memantau aplikasi dan perangkat booth",
      },
    },
    {
      number: "04",
      eyebrow: "Deliver",
      title: "Kirim hasil foto setelah sesi selesai.",
      description:
        "Pengunjung membuka hasil sesi dari ponsel, sementara file dan riwayat transaksi tetap tercatat di workspace.",
      points: ["Halaman hasil untuk pengunjung", "Download dari ponsel", "Riwayat sesi tersimpan"],
      asset: landingAssets.customerDelivery,
    },
  ],
} as const;
