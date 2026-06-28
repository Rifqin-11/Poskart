"use client";

import type { ReactNode } from "react";
import { CalendarDays, Grid2X2, Image as ImageIcon, Square, Type } from "lucide-react";
import type { FrameNodeType } from "@/types/frame-template";

export const FRAME_NODE_TYPES: {
  type: FrameNodeType;
  label: string;
  icon: ReactNode;
}[] = [
  { type: "text", label: "Text", icon: <Type className="size-3.5" /> },
  { type: "image", label: "Image", icon: <ImageIcon className="size-3.5" /> },
  { type: "border", label: "Border", icon: <Square className="size-3.5" /> },
  {
    type: "date-stamp",
    label: "Date",
    icon: <CalendarDays className="size-3.5" />,
  },
  { type: "background", label: "Bg", icon: <ImageIcon className="size-3.5" /> },
  {
    type: "photo-slot",
    label: "Photo slot",
    icon: <Grid2X2 className="size-3.5" />,
  },
];

export const FRAME_SNAP_THRESHOLD = 8;
