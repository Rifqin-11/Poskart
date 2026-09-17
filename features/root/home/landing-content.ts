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
  boothApp: {
    src: "/landing/booth-camera.webp",
    alt: "Aplikasi Flutter POSKART yang berjalan di perangkat booth",
  },
} as const;
