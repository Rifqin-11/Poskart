export type ColorKeyRegion = {
  /** Normalized coordinates relative to the source image (0...1). */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ColorKeySettings = {
  enabled: boolean;
  color: string;
  tolerance: number;
  softness: number;
  smoothness?: number;
  /** When present, background removal is restricted to these regions. */
  regions?: ColorKeyRegion[];
};
