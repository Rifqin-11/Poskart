/** Types for the photo-frame template designer (the printed postcard/receipt output) */

export type FrameNodeType =
  | "photo-slot"     // Where a captured photo is composited
  | "text"           // Static text (watermark, branding, tagline)
  | "image"          // Logo, stamp, decorative image
  | "border"         // Decorative border/overlay layer
  | "date-stamp"     // Auto-populated with session date
  | "background";    // Background fill / full-bleed image

export type FrameNode = {
  id: string;
  type: FrameNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  props: Record<string, unknown>;
};

/** The design-space canvas (in px — Flutter scales to physical print size) */
export type FrameCanvas = {
  /** Design width in px. Default 420 (A6-ish portrait, 2:3) */
  width: number;
  /** Design height in px */
  height: number;
  /** Background color of the frame */
  backgroundColor: string;
};

/** Full frame layout schema serialised to Template.frameLayout (JSONB) */
export type FrameLayout = {
  version: 1;
  canvas: FrameCanvas;
  nodes: FrameNode[];
};

export const DEFAULT_FRAME_CANVAS: FrameCanvas = {
  width: 420,
  height: 630,
  backgroundColor: "#FAF8F2",
};
