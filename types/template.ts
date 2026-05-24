import type { FrameLayout } from "./frame-template";

export type Template = {
  id: string;
  name: string;
  category: "receipt" | "frame" | "postcard" | "seasonal" | "event";
  status: "published" | "draft" | "archived";
  assignedBooths: number;
  updatedAt: string;
  // Flutter frame template fields
  tagline?: string;
  photoCount: number;
  accentColor: string;
  frameImageUrl?: string;
  isDefault: boolean;
  /** Full visual frame layout — designed in the Frame Builder */
  frameLayout?: FrameLayout | null;
};

export type TemplateFormValues = {
  name: string;
  category: Template["category"];
  status: Template["status"];
  tagline: string;
  photoCount: number;
  accentColor: string;
  frameImageUrl: string;
  isDefault: boolean;
  frameLayout?: FrameLayout | null;
};
