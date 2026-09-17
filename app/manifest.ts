import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "POSKART Receipt Photobooth App",
    short_name: "POSKART",
    description:
      "Receipt photobooth app untuk mengatur frame, kamera, printer, QRIS, antrean, gallery, dan banyak booth dari satu dashboard.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f9ff",
    theme_color: "#00357B",
    orientation: "landscape-primary",
    icons: [
      {
        src: "/logo.png",
        sizes: "2000x2000",
        type: "image/png",
      },
    ],
    categories: ["business", "productivity"],
  };
}
