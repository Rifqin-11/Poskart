export type BuilderPage = "landing" | "payment" | "camera" | "preview" | "thanks";

export type BuilderComponentType =
  | "text"
  | "image"
  | "button"
  | "stamp"
  | "qr"
  | "qr-placeholder"
  | "camera-view"
  | "receipt-preview"
  | "frame-preview"
  | "social-handle"
  | "background-decoration";

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
  pageBackgrounds?: Partial<Record<BuilderPage, { image?: string; video?: string }>>;
  /** If true, nodes render as colored hotspot overlays instead of real UI components */
  overlayMode?: boolean;
};

export type LayoutSchema = {
  version: 1;
  canvas: BuilderCanvas;
  pages: Record<BuilderPage, BuilderNode[]>;
};
