export type BuilderPage =
  | "landing"
  | "template"
  | "camera"
  | "preview"
  | "thanks";

export type BuilderComponentType =
  | "text"
  | "image"
  | "button"
  | "qr"
  | "qr-link"
  | "qr-placeholder"
  | "camera-view"
  | "photo-result" // Captured photo result slot on camera page
  | "receipt-preview"
  | "frame-preview"
  | "template-list" // Grid of frame templates on the /template picker page
  | "template-preview" // Large single-template preview panel
  | "social-handle"
  | "background-decoration"
  | "return-countdown" // Spinning loader + auto-return text on thanks page
  | "session-countdown" // Total-session countdown shown on template/camera/preview/thanks
  | "payment-countdown"; // Payment QRIS countdown shown on the payment page

export type BuilderNode = {
  id: string;
  type: BuilderComponentType;
  page: BuilderPage;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  /** When true, resize preserves width/height ratio */
  lockAspect?: boolean;
  props: Record<string, unknown>;
};

export type BuilderCanvas = {
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  /** Per-page background images/videos — keyed by BuilderPage */
  pageBackgrounds?: Partial<
    Record<BuilderPage, { image?: string; video?: string }>
  >;
  /** If true, nodes render as colored hotspot overlays instead of real UI components */
  overlayMode?: boolean;
  /** Pages omitted from this array will be hidden on the tablet app.
   *  Undefined means all pages enabled. */
  enabledPages?: BuilderPage[];
  /** Payment dialog dimensions (as fraction of canvas).
   *  Flutter: maxWidth 520, centered dialog.
   *  On 1280x800: widthRatio=0.406 (520/1280), heightRatio=0.75 (~600/800) */
  paymentModal?: {
    widthRatio: number;
    heightRatio: number;
    borderRadius: number;
    barrierColor?: string;
    backgroundColor?: string;
  };
  /** User-imported custom fonts. Saved alongside theme so they can be re-injected on load. */
  customFonts?: { name: string; url: string }[];
  /** Global page transition effect used by the tablet app */
  transitionType?: "fade" | "slide-horizontal" | "slide-vertical" | "zoom" | "none";
  /** Transition duration in milliseconds (default: 300) */
  transitionDurationMs?: number;
  /** Transition animation curve */
  transitionCurve?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce";
};

export type LayoutSchema = {
  version: 1;
  canvas: BuilderCanvas;
  pages: Record<BuilderPage, BuilderNode[]>;
};
