import type { BuilderComponentType, BuilderPage } from "@/types/builder";

/** Semantic roles Flutter uses to bind the correct action handler to each button */
export const SEMANTIC_ROLES: { value: string; label: string; screen: string }[] = [
  {
    value: "landing.start_session",
    label: "Start Session (fullscreen tap)",
    screen: "landing",
  },
  { value: "landing.settings", label: "Settings / Config", screen: "landing" },
  {
    value: "payment.confirm",
    label: "Sudah Bayar (Confirm)",
    screen: "payment",
  },
  { value: "payment.cancel", label: "Batal (Cancel)", screen: "payment" },
  {
    value: "payment.qr_display",
    label: "QRIS Display Area",
    screen: "payment",
  },
  {
    value: "template.select",
    label: "Select Template Tile",
    screen: "template",
  },
  {
    value: "template.continue",
    label: "Continue -> Camera",
    screen: "template",
  },
  { value: "template.back", label: "Back <- Landing", screen: "template" },
  {
    value: "camera.take_photo",
    label: "Take Photo (Shutter)",
    screen: "camera",
  },
  {
    value: "camera.continue",
    label: "Continue after all photos",
    screen: "camera",
  },
  { value: "camera.retake", label: "Retake photo slot", screen: "camera" },
  {
    value: "camera.countdown_area",
    label: "Countdown Overlay Area",
    screen: "camera",
  },
  { value: "camera.flash_area", label: "Flash Overlay Area", screen: "camera" },
  {
    value: "camera.photo_result",
    label: "Photo Result Slot",
    screen: "camera",
  },
  { value: "preview.print", label: "Print", screen: "preview" },
  { value: "preview.finish", label: "Finish / Done", screen: "preview" },
  {
    value: "preview.share",
    label: "Share / Download - planned",
    screen: "preview",
  },
  {
    value: "preview.qr_download",
    label: "QR Download Area",
    screen: "preview",
  },
  {
    value: "thanks.return_home",
    label: "Return to Landing - auto-only",
    screen: "thanks",
  },
  {
    value: "thanks.countdown_timer",
    label: "Countdown Auto-Return Timer",
    screen: "thanks",
  },
  { value: "generic.action", label: "Generic (no binding)", screen: "generic" },
];

export const pageLabels: BuilderPage[] = [
  "landing",
  "payment",
  "template",
  "camera",
  "preview",
  "thanks",
];

/** Human-readable label and icon for each component type */
export const COMPONENT_META: Record<
  BuilderComponentType,
  { label: string; icon: string }
> = {
  text: { label: "Text", icon: "T" },
  image: { label: "Image", icon: "Image" },
  button: { label: "Button", icon: "Button" },
  stamp: { label: "Stamp / Sticker", icon: "Pin" },
  qr: { label: "QR Download", icon: "QR" },
  "qr-placeholder": { label: "QRIS Payment", icon: "Pay" },
  "camera-view": { label: "Camera View", icon: "Camera" },
  "photo-result": { label: "Photo Result", icon: "Photo" },
  "countdown-overlay": { label: "Countdown Overlay", icon: "Timer" },
  "flash-overlay": { label: "Flash Overlay", icon: "Flash" },
  "receipt-preview": { label: "Receipt Preview", icon: "Receipt" },
  "frame-preview": { label: "Frame Preview", icon: "Frame" },
  "template-list": { label: "Template Grid", icon: "Grid" },
  "template-preview": { label: "Template Preview", icon: "Preview" },
  "social-handle": { label: "Social Handle", icon: "@" },
  "background-decoration": { label: "BG Decoration", icon: "BG" },
  "return-countdown": { label: "Return Countdown", icon: "Return" },
  "session-countdown": { label: "Session Countdown", icon: "Session" },
  "payment-countdown": { label: "Payment Countdown", icon: "Pay" },
};

/** Components available per page. Only show relevant items in Add panel. */
export const PAGE_COMPONENTS: Record<BuilderPage, BuilderComponentType[]> = {
  landing: ["text", "image", "button", "stamp", "social-handle", "background-decoration"],
  payment: ["text", "image", "button", "qr-placeholder", "stamp", "background-decoration", "payment-countdown"],
  template: ["text", "image", "button", "template-preview", "template-list", "stamp", "background-decoration", "session-countdown"],
  camera: ["text", "image", "camera-view", "photo-result", "countdown-overlay", "flash-overlay", "button", "stamp", "social-handle", "background-decoration", "session-countdown"],
  preview: ["text", "image", "button", "qr", "receipt-preview", "frame-preview", "stamp", "social-handle", "background-decoration", "session-countdown"],
  thanks: ["text", "image", "button", "qr", "frame-preview", "stamp", "social-handle", "background-decoration", "return-countdown", "session-countdown"],
};

/** Semantic roles shown per page in the Properties dropdown */
export const PAGE_ROLES: Record<BuilderPage | "generic", string[]> = {
  landing: ["landing.start_session", "landing.settings"],
  payment: ["payment.confirm", "payment.cancel", "payment.qr_display"],
  template: ["template.select", "template.continue", "template.back"],
  camera: [
    "camera.take_photo",
    "camera.continue",
    "camera.retake",
    "camera.countdown_area",
    "camera.flash_area",
    "camera.photo_result",
  ],
  preview: ["preview.print", "preview.finish", "preview.share", "preview.qr_download"],
  thanks: ["thanks.return_home", "thanks.countdown_timer"],
  generic: ["generic.action"],
};

/** Color per component type for hotspot overlay mode */
export const HOTSPOT_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  button: { bg: "rgba(59,130,246,0.22)", border: "#3b82f6", text: "#1d4ed8" },
  "camera-view": { bg: "rgba(15,15,25,0.45)", border: "#a1a1aa", text: "#ffffff" },
  "photo-result": { bg: "rgba(20,184,166,0.25)", border: "#14b8a6", text: "#0d9488" },
  "countdown-overlay": { bg: "rgba(239,68,68,0.18)", border: "#ef4444", text: "#b91c1c" },
  "flash-overlay": { bg: "rgba(253,224,71,0.35)", border: "#eab308", text: "#713f12" },
  text: { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", text: "#6d28d9" },
  "social-handle": { bg: "rgba(139,92,246,0.12)", border: "#a78bfa", text: "#7c3aed" },
  "qr-placeholder": { bg: "rgba(245,158,11,0.22)", border: "#f59e0b", text: "#b45309" },
  "receipt-preview": { bg: "rgba(168,85,247,0.20)", border: "#a855f7", text: "#7e22ce" },
  qr: { bg: "rgba(245,158,11,0.18)", border: "#fbbf24", text: "#92400e" },
  image: { bg: "rgba(16,185,129,0.18)", border: "#10b981", text: "#065f46" },
  stamp: { bg: "rgba(16,185,129,0.14)", border: "#34d399", text: "#065f46" },
  "frame-preview": { bg: "rgba(16,185,129,0.14)", border: "#34d399", text: "#065f46" },
  "template-list": { bg: "rgba(234,88,12,0.18)", border: "#ea580c", text: "#9a3412" },
  "template-preview": { bg: "rgba(234,88,12,0.12)", border: "#fb923c", text: "#9a3412" },
  "background-decoration": { bg: "rgba(100,116,139,0.15)", border: "#94a3b8", text: "#475569" },
  "return-countdown": { bg: "rgba(99,102,241,0.15)", border: "#6366f1", text: "#4338ca" },
  "session-countdown": { bg: "rgba(244,63,94,0.15)", border: "#f43f5e", text: "#9f1239" },
  "payment-countdown": { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#15803d" },
};
