import type { BuilderCanvas, BuilderNode } from "@/types/builder";

export const defaultBuilderCanvas: BuilderCanvas = {
  width: 1280,
  height: 800,
  orientation: "landscape",
  backgroundColor: "#F5F1E8",
  paymentModal: {
    widthRatio: 0.406,
    heightRatio: 0.75,
    borderRadius: 20,
    barrierColor: "#1B1B1B",
    backgroundColor: "#FAF8F2",
  },
  transitionType: "fade",
  transitionDurationMs: 300,
  transitionCurve: "easeInOut",
};

export function createDefaultBuilderNodeProps(type: BuilderNode["type"]) {
  if (type === "button") {
    return {
      label: "Button",
      background: "#18181b",
      color: "#ffffff",
      radius: 6,
      fontSize: 14,
    };
  }

  if (type === "qr-placeholder") {
    return { label: "QRIS" };
  }

  if (type === "qr") {
    return {
      label: "Download",
      semanticRole: "preview.qr_download",
      showQrLink: true,
      qrTransparentBackground: false,
      showShareButton: false,
      shareButtonLabel: "Share",
      shareButtonBackground: "#18181b",
      shareButtonColor: "#ffffff",
    };
  }

  if (type === "preview-media-toggle") {
    return {
      defaultMode: "photo",
      photoLabel: "Photo",
      gifLabel: "GIF",
      livePhotoLabel: "Live",
    };
  }

  if (type === "camera-view") {
    return { label: "Camera" };
  }

  if (type === "photo-result") {
    return {
      semanticRole: "camera.photo_result",
      photoLayout: "auto",
      photoColumns: 0,
      samplePhotoCount: 4,
      radius: 8,
    };
  }

  if (type === "template-list") {
    return {
      minTileWidth: 280,
      tileCount: 4,
      templateLayout: "auto",
      templateColumns: 0,
      templateGap: 8,
      radius: 12,
    };
  }

  if (
    type === "image" ||
    type === "frame-preview" ||
    type === "background-decoration"
  ) {
    return {
      src: "",
      alt: type,
      mediaType: "image",
      objectFit: "cover",
      radius: 8,
    };
  }

  if (type === "qr-link") {
    return {
      label: "https://poskart.app/s/...",
      fontSize: 12,
      color: "#3b82f6",
    };
  }

  if (type === "return-countdown") {
    return { countdownText: "Kembali ke halaman awal", countdownSeconds: 8 };
  }

  return {
    content: type.replace("-", " "),
    fontSize: 18,
    color: "#18181b",
    fontWeight: 500,
  };
}
