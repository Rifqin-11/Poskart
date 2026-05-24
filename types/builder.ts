export type BuilderPage = "landing" | "camera" | "preview" | "thanks";

export type BuilderComponentType =
  | "text"
  | "image"
  | "button"
  | "stamp"
  | "qr"
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

export type LayoutSchema = {
  version: 1;
  canvas: { width: number; height: number; orientation: "portrait" | "landscape" };
  pages: Record<BuilderPage, BuilderNode[]>;
};
