import {
  Type,
  Image as ImageIcon,
  Link2,
  QrCode,
  CreditCard,
  Camera,
  Receipt,
  Layers,
  Grid2X2,
  Eye,
  AtSign,
  PaintBucket,
  Clock,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { BuilderComponentType, BuilderPage } from "@/types/builder";

/** Semantic roles Flutter uses to bind the correct action handler to each button */
export const SEMANTIC_ROLES: {
  value: string;
  label: string;
  screen: string;
}[] = [
  {
    value: "landing.start_session",
    label: "Start Session (fullscreen tap)",
    screen: "landing",
  },
  { value: "landing.settings", label: "Settings / Config", screen: "landing" },
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
    value: "camera.photo_result",
    label: "Photo Result Slot",
    screen: "camera",
  },
  { value: "preview.print", label: "Print", screen: "preview" },
  { value: "preview.finish", label: "Finish / Done", screen: "preview" },
  {
    value: "preview.share",
    label: "Kirim Link Softfile",
    screen: "preview",
  },
  {
    value: "preview.qr_download",
    label: "QR Download Area",
    screen: "preview",
  },
  {
    value: "preview.retake",
    label: "Retake / Back to Camera",
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
  "template",
  "camera",
  "preview",
  "thanks",
];

/** Human-readable label and icon for each component type */
export const COMPONENT_META: Record<
  BuilderComponentType,
  { label: string; icon: LucideIcon }
> = {
  text: { label: "Text", icon: Type },
  image: { label: "Image", icon: ImageIcon },
  button: { label: "Button", icon: Link2 },
  qr: { label: "QR Download", icon: QrCode },
  "qr-link": { label: "QR Code Link", icon: QrCode },
  "qr-placeholder": { label: "QRIS Payment", icon: CreditCard },
  "camera-view": { label: "Camera View", icon: Camera },
  "photo-result": { label: "Photo Result", icon: ImageIcon },
  "receipt-preview": { label: "Receipt Preview", icon: Receipt },
  "frame-preview": { label: "Frame Preview", icon: Layers },
  "template-list": { label: "Template Grid", icon: Grid2X2 },
  "template-preview": { label: "Template Preview", icon: Eye },
  "social-handle": { label: "Social Handle", icon: AtSign },
  "background-decoration": { label: "BG Decoration", icon: PaintBucket },
  "return-countdown": { label: "Return Countdown", icon: Timer },
  "session-countdown": { label: "Session Countdown", icon: Clock },
  "payment-countdown": { label: "Payment Countdown", icon: Clock },
  background: { label: "Page Background", icon: ImageIcon },
};

/** Components available per page. Only show relevant items in Add panel. */
export const PAGE_COMPONENTS: Record<BuilderPage, BuilderComponentType[]> = {
  landing: [
    "text",
    "image",
    "button",
    "social-handle",
    "background-decoration",
  ],
  template: [
    "text",
    "image",
    "button",
    "template-preview",
    "template-list",
    "background-decoration",
  ],
  camera: [
    "text",
    "image",
    "camera-view",
    "photo-result",
    "button",
    "social-handle",
    "background-decoration",
  ],
  preview: [
    "text",
    "image",
    "button",
    "qr",
    "receipt-preview",
    "frame-preview",
    "social-handle",
    "background-decoration",
  ],
  thanks: [
    "text",
    "image",
    "button",
    "qr",
    "frame-preview",
    "social-handle",
    "background-decoration",
    "return-countdown",
  ],
};

/** Semantic roles shown per page in the Properties dropdown */
export const PAGE_ROLES: Record<BuilderPage | "generic", string[]> = {
  landing: ["landing.start_session", "landing.settings"],
  template: ["template.select", "template.continue", "template.back"],
  camera: [
    "camera.take_photo",
    "camera.continue",
    "camera.retake",
    "camera.photo_result",
  ],
  preview: [
    "preview.print",
    "preview.finish",
    "preview.share",
    "preview.qr_download",
    "preview.retake",
  ],
  thanks: ["thanks.return_home", "thanks.countdown_timer"],
  generic: ["generic.action"],
};

/** Color per component type for hotspot overlay mode */
export const HOTSPOT_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  button: { bg: "rgba(59,130,246,0.22)", border: "#3b82f6", text: "#1d4ed8" },
  "camera-view": {
    bg: "rgba(15,15,25,0.45)",
    border: "#a1a1aa",
    text: "#ffffff",
  },
  "photo-result": {
    bg: "rgba(20,184,166,0.25)",
    border: "#14b8a6",
    text: "#0d9488",
  },
  text: { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", text: "#6d28d9" },
  "social-handle": {
    bg: "rgba(139,92,246,0.12)",
    border: "#a78bfa",
    text: "#7c3aed",
  },
  "qr-placeholder": {
    bg: "rgba(245,158,11,0.22)",
    border: "#f59e0b",
    text: "#b45309",
  },
  "receipt-preview": {
    bg: "rgba(168,85,247,0.20)",
    border: "#a855f7",
    text: "#7e22ce",
  },
  qr: { bg: "rgba(245,158,11,0.18)", border: "#fbbf24", text: "#92400e" },
  "qr-link": {
    bg: "rgba(245,158,11,0.20)",
    border: "#fbbf24",
    text: "#92400e",
  },
  image: { bg: "rgba(16,185,129,0.18)", border: "#10b981", text: "#065f46" },
  "frame-preview": {
    bg: "rgba(16,185,129,0.14)",
    border: "#34d399",
    text: "#065f46",
  },
  "template-list": {
    bg: "rgba(234,88,12,0.18)",
    border: "#ea580c",
    text: "#9a3412",
  },
  "template-preview": {
    bg: "rgba(234,88,12,0.12)",
    border: "#fb923c",
    text: "#9a3412",
  },
  "background-decoration": {
    bg: "rgba(100,116,139,0.15)",
    border: "#94a3b8",
    text: "#475569",
  },
  "return-countdown": {
    bg: "rgba(99,102,241,0.15)",
    border: "#6366f1",
    text: "#4338ca",
  },
  "session-countdown": {
    bg: "rgba(244,63,94,0.15)",
    border: "#f43f5e",
    text: "#9f1239",
  },
  "payment-countdown": {
    bg: "rgba(34,197,94,0.15)",
    border: "#22c55e",
    text: "#15803d",
  },
};
