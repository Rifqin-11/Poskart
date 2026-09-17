/**
 * Landing assets point at pre-sized WebP derivatives in /public/landing.
 *
 * The original PNG exports are 3000px-wide screenshots (~0.3–1.6 MB each).
 * Serving them directly cost roughly 3.8 MB of transfer; the WebP set is
 * ~220 KB in total. Regenerate with: `node scripts/optimize-landing-images.mjs`.
 */
export const landingAssets = {
  hero: {
    src: "/landing/dashboard.webp",
    alt: "Dashboard admin POSKART untuk mengelola operasional photobooth",
  },
  builder: {
    src: "/landing/frames.webp",
    alt: "Halaman pengelolaan frame photobooth POSKART",
  },
  operations: {
    src: "/landing/queue.webp",
    alt: "Halaman antrean sesi photobooth POSKART",
  },
  delivery: {
    src: "/landing/settings.webp",
    alt: "Halaman pengaturan POSKART",
  },
  Pairing: {
    src: "/landing/pairing.webp",
    alt: "Halaman pairing device POSKART",
  },
  showcase: {
    src: "/landing/showcase.webp",
    alt: "Halaman pengelolaan showcase POSKART",
  },
  boothApp: {
    src: "/landing/booth-camera.webp",
    alt: "Aplikasi Flutter POSKART yang berjalan di perangkat booth",
  },
  customerDelivery: {
    src: "/landing/booth-settings.webp",
    alt: "Pengaturan aplikasi booth POSKART",
  },
  AppSettings: {
    src: "/landing/booth-settings.webp",
    alt: "Pengaturan aplikasi booth POSKART",
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
      src: "/landing/devices.webp",
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
      "Perbarui tema dan frame dari Admin Web. Booth tetap melayani pengunjung tanpa menghentikan operasional.",
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
        src: "/landing/devices.webp",
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
