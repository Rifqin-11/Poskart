"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BringToFront,
  Camera,
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  Film,
  FolderOpen,
  Grid2X2,
  Image as ImageIcon,
  Link2,
  Lock,
  Maximize2,
  Monitor,
  Move,
  PaintBucket,
  Plus,
  Redo2,
  RotateCw,
  Save,
  SendToBack,
  Smartphone,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useActiveLayoutSchema,
  useLayoutSchemas,
  useSaveLayoutAsTheme,
} from "@/hooks/use-admin-data";
import { adminService } from "@/lib/services/admin-service";
import {
  autoSaveSchema,
  deleteDraft,
  getDrafts,
  getAutoSave,
  relativeTime,
  saveDraft,
  type LocalDraft,
} from "@/lib/services/draft-service";
import {
  uploadBuilderImage,
  uploadBuilderMedia,
} from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type {
  BuilderComponentType,
  BuilderNode,
  BuilderPage,
} from "@/types/builder";

/** Semantic roles Flutter uses to bind the correct action handler to each button */
const SEMANTIC_ROLES: { value: string; label: string; screen: string }[] = [
  // Landing
  {
    value: "landing.start_session",
    label: "Start Session (fullscreen tap)",
    screen: "landing",
  },
  { value: "landing.settings", label: "Settings / Config", screen: "landing" },
  // Payment
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
  // Template picker
  {
    value: "template.select",
    label: "Select Template Tile",
    screen: "template",
  },
  {
    value: "template.continue",
    label: "Continue → Camera",
    screen: "template",
  },
  { value: "template.back", label: "Back ← Landing", screen: "template" },
  // Camera
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
  // Preview
  { value: "preview.print", label: "Print", screen: "preview" },
  { value: "preview.finish", label: "Finish / Done", screen: "preview" },
  {
    value: "preview.share",
    label: "Share / Download ⚠️ planned",
    screen: "preview",
  },
  {
    value: "preview.qr_download",
    label: "QR Download Area",
    screen: "preview",
  },
  // Thanks
  {
    value: "thanks.return_home",
    label: "Return to Landing ⚠️ auto-only",
    screen: "thanks",
  },
  {
    value: "thanks.countdown_timer",
    label: "Countdown Auto-Return Timer",
    screen: "thanks",
  },
  // Generic
  { value: "generic.action", label: "Generic (no binding)", screen: "generic" },
];

const pageLabels: BuilderPage[] = [
  "landing",
  "payment",
  "template",
  "camera",
  "preview",
  "thanks",
];

/** All registered component types — used only for NodeRenderer type checking */
const componentTypes: BuilderComponentType[] = [
  "text",
  "image",
  "button",
  "stamp",
  "qr",
  "qr-placeholder",
  "camera-view",
  "photo-result",
  "countdown-overlay",
  "flash-overlay",
  "receipt-preview",
  "frame-preview",
  "template-list",
  "template-preview",
  "social-handle",
  "background-decoration",
  "return-countdown",
  "session-countdown",
  "payment-countdown",
];

/** Human-readable label and icon for each component type */
const COMPONENT_META: Record<
  BuilderComponentType,
  { label: string; icon: string }
> = {
  text: { label: "Text", icon: "T" },
  image: { label: "Image", icon: "🖼" },
  button: { label: "Button", icon: "🔘" },
  stamp: { label: "Stamp / Sticker", icon: "📌" },
  qr: { label: "QR Download", icon: "📲" },
  "qr-placeholder": { label: "QRIS Payment", icon: "💳" },
  "camera-view": { label: "Camera View", icon: "📷" },
  "photo-result": { label: "Photo Result", icon: "📸" },
  "countdown-overlay": { label: "Countdown Overlay", icon: "⏱" },
  "flash-overlay": { label: "Flash Overlay", icon: "⚡" },
  "receipt-preview": { label: "Receipt Preview", icon: "🧾" },
  "frame-preview": { label: "Frame Preview", icon: "🖼" },
  "template-list": { label: "Template Grid", icon: "▦" },
  "template-preview": { label: "Template Preview", icon: "🖼" },
  "social-handle": { label: "Social Handle", icon: "@" },
  "background-decoration": { label: "BG Decoration", icon: "🎨" },
  "return-countdown": { label: "Return Countdown", icon: "⏳" },
  "session-countdown": { label: "Session Countdown", icon: "⏱️" },
  "payment-countdown": { label: "Payment Countdown", icon: "💳" },
};

/** Components available per page — only show relevant items in Add panel */
const PAGE_COMPONENTS: Record<BuilderPage, BuilderComponentType[]> = {
  landing: [
    "text",
    "image",
    "button",
    "stamp",
    "social-handle",
    "background-decoration",
  ],
  payment: [
    "text",
    "image",
    "button",
    "qr-placeholder",
    "stamp",
    "background-decoration",
    "payment-countdown",
  ],
  template: [
    "text",
    "image",
    "button",
    "template-preview",
    "template-list",
    "stamp",
    "background-decoration",
    "session-countdown",
  ],
  camera: [
    "text",
    "image",
    "camera-view",
    "photo-result",
    "countdown-overlay",
    "flash-overlay",
    "button",
    "stamp",
    "social-handle",
    "background-decoration",
    "session-countdown",
  ],
  preview: [
    "text",
    "image",
    "button",
    "qr",
    "receipt-preview",
    "frame-preview",
    "stamp",
    "social-handle",
    "background-decoration",
    "session-countdown",
  ],
  thanks: [
    "text",
    "image",
    "button",
    "qr",
    "frame-preview",
    "stamp",
    "social-handle",
    "background-decoration",
    "return-countdown",
    "session-countdown",
  ],
};

/** Semantic roles shown per page in the Properties dropdown */
const PAGE_ROLES: Record<BuilderPage | "generic", string[]> = {
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
  preview: [
    "preview.print",
    "preview.finish",
    "preview.share",
    "preview.qr_download",
  ],
  thanks: ["thanks.return_home", "thanks.countdown_timer"],
  generic: ["generic.action"],
};

function snap(value: number) {
  return Math.round(value / 8) * 8;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function isMediaNode(node: BuilderNode) {
  return (
    node.type === "image" ||
    node.type === "frame-preview" ||
    node.type === "stamp" ||
    node.type === "background-decoration"
  );
}

function isCameraView(node: BuilderNode) {
  return node.type === "camera-view";
}

function isQrPlaceholder(node: BuilderNode) {
  return node.type === "qr-placeholder";
}

function isEditableTextNode(node: BuilderNode) {
  return (
    node.type === "text" ||
    node.type === "button" ||
    node.type === "social-handle"
  );
}

/** Color per component type for hotspot overlay mode */
const HOTSPOT_COLORS: Record<
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
  "countdown-overlay": {
    bg: "rgba(239,68,68,0.18)",
    border: "#ef4444",
    text: "#b91c1c",
  },
  "flash-overlay": {
    bg: "rgba(253,224,71,0.35)",
    border: "#eab308",
    text: "#713f12",
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
  image: { bg: "rgba(16,185,129,0.18)", border: "#10b981", text: "#065f46" },
  stamp: { bg: "rgba(16,185,129,0.14)", border: "#34d399", text: "#065f46" },
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

/** Hotspot overlay — shown when canvas has a background image/video */
function HotspotOverlay({ node }: { node: BuilderNode }) {
  const canvas = useBuilderStore((state) => state.canvas);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const colors = HOTSPOT_COLORS[node.type] ?? {
    bg: "rgba(100,100,100,0.2)",
    border: "#71717a",
    text: "#3f3f46",
  };
  const role =
    typeof node.props.semanticRole === "string" ? node.props.semanticRole : "";

  // Scale labels proportionally to canvas width (min values for small canvases)
  const labelSize = Math.max(12, Math.round(canvas.width * 0.028));
  const roleSize = Math.max(10, Math.round(canvas.width * 0.022));
  const padH = Math.max(6, Math.round(canvas.width * 0.008));
  const padV = Math.max(3, Math.round(canvas.width * 0.004));
  const borderW = Math.max(2, Math.round(canvas.width * 0.003));

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden text-center"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        borderWidth: borderW,
        borderStyle: "dashed",
        borderRadius: 4,
      }}
    >
      <span
        className="max-w-full truncate rounded font-bold uppercase tracking-wide"
        style={{
          color: colors.text,
          background: colors.border + "22",
          fontSize: labelSize,
          paddingLeft: padH,
          paddingRight: padH,
          paddingTop: padV,
          paddingBottom: padV,
        }}
      >
        {node.type}
      </span>

      {role ? (
        <span
          className="max-w-full truncate font-mono"
          style={{ color: colors.text, opacity: 0.85, fontSize: roleSize }}
        >
          {role}
        </span>
      ) : null}
    </div>
  );
}

function NodeRenderer({
  node,
  editing,
  editValue,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onStartEdit,
}: {
  node: BuilderNode;
  editing?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  onEditCommit?: () => void;
  onEditCancel?: () => void;
  onStartEdit?: () => void;
}) {
  const canvas = useBuilderStore((state) => state.canvas);
  const isOverlayMode = !!canvas.overlayMode;
  const color = readString(node.props.color, "#18181b");

  // Default font size scales with canvas (ref 1080px → 30px ≈ 2.8%; min 14px)
  const scaledDefaultFontSize = Math.max(14, Math.round(canvas.width * 0.028));
  const fontSize = readNumber(node.props.fontSize, scaledDefaultFontSize);

  // When a background image/video is set, all nodes become hotspot overlays
  if (isOverlayMode) return <HotspotOverlay node={node} />;

  if (node.type === "button") {
    const role = readString(
      (node.props.semanticRole as string | undefined) ?? "",
      "",
    );
    const roleLabel = SEMANTIC_ROLES.find((r) => r.value === role)?.label;
    const iconSvg =
      typeof node.props.iconSvg === "string" ? node.props.iconSvg : "";
    const iconPos =
      typeof node.props.iconPosition === "string"
        ? node.props.iconPosition
        : "left";
    const iconSize = readNumber(node.props.iconSize, 20);
    const label = readString(node.props.label, "Button");
    const btnColor = readString(node.props.color, "#ffffff");

    if (editing) {
      return (
        <input
          autoFocus
          className="h-full w-full border-none bg-transparent px-3 text-center text-sm font-medium outline-none"
          style={{
            background: readString(node.props.background, "#18181b"),
            color: btnColor,
            borderRadius: readNumber(node.props.radius, 6),
            fontSize: readNumber(node.props.fontSize, 14),
          }}
          value={editValue ?? ""}
          onChange={(event) => onEditChange?.(event.target.value)}
          onBlur={onEditCommit}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") onEditCommit?.();
            if (event.key === "Escape") onEditCancel?.();
          }}
        />
      );
    }

    // Fix SVG size: strip existing width/height attrs and set via style
    const scaledSvg = iconSvg
      ? iconSvg.replace(/^<svg([^>]*?)>/, (_, attrs: string) => {
          const clean = attrs.replace(/\s+(width|height)="[^"]*"/g, "");
          return `<svg${clean} style="width:${iconSize}px;height:${iconSize}px;display:block;">`;
        })
      : "";

    // Build icon element
    const iconEl = scaledSvg ? (
      <span
        className="shrink-0"
        style={{
          width: iconSize,
          height: iconSize,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        dangerouslySetInnerHTML={{ __html: scaledSvg }}
      />
    ) : null;

    // Layout based on iconPosition
    const isIconOnly = iconPos === "only";
    const isVertical = iconPos === "top" || iconPos === "bottom";
    const flexDir = isVertical ? "column" : "row";
    const reverseOrder = iconPos === "right" || iconPos === "bottom";

    return (
      <div
        className="relative h-full w-full overflow-hidden font-medium shadow-sm"
        style={{
          background: readString(node.props.background, "#18181b"),
          color: btnColor,
          borderRadius: readNumber(
            node.props.radius,
            Math.max(6, Math.round(canvas.width * 0.005)),
          ),
          fontSize: readNumber(node.props.fontSize, scaledDefaultFontSize),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: flexDir as React.CSSProperties["flexDirection"],
          gap: iconEl && !isIconOnly ? 6 : 0,
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onStartEdit?.();
        }}
      >
        {!reverseOrder && iconEl}
        {!isIconOnly && <span>{label}</span>}
        {reverseOrder && iconEl}
        {/* Semantic role badge */}
        {roleLabel ? (
          <span
            className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-950/80 px-1.5 py-0.5 font-mono text-white"
            style={{ fontSize: Math.max(9, Math.round(canvas.width * 0.009)) }}
          >
            {role}
          </span>
        ) : (
          <span
            className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-500/90 px-1.5 py-0.5 font-mono text-white"
            style={{ fontSize: Math.max(9, Math.round(canvas.width * 0.009)) }}
          >
            ⚠ no role set
          </span>
        )}
      </div>
    );
  }

  if (node.type === "qr") {
    return (
      <div className="grid h-full w-full place-items-center rounded-md border border-zinc-300 bg-white p-3">
        <div className="grid size-full grid-cols-4 grid-rows-4 gap-1">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "rounded-sm",
                index % 3 === 0 ? "bg-zinc-950" : "bg-zinc-200",
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "camera-view") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-zinc-950">
        {/* Camera grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
            backgroundSize: "33.33% 33.33%",
          }}
        />
        {/* Center camera icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="size-14 text-white/20" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">
            Live Camera Feed
          </span>
        </div>
        {/* Finder corners TL */}
        <div className="absolute left-3 top-3 h-7 w-7 border-l-2 border-t-2 border-white/60" />
        {/* Finder corners TR */}
        <div className="absolute right-3 top-3 h-7 w-7 border-r-2 border-t-2 border-white/60" />
        {/* Finder corners BL */}
        <div className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-white/60" />
        {/* Finder corners BR */}
        <div className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-white/60" />
        {/* LIVE badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5">
          <div className="size-1.5 animate-pulse rounded-full bg-white" />
          <span className="text-[9px] font-bold uppercase tracking-wide text-white">
            Live
          </span>
        </div>
        {/* Center crosshair */}
        <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-1/2 h-full w-px -translate-x-1/2 bg-white/30" />
          <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-white/30" />
        </div>
      </div>
    );
  }

  if (node.type === "photo-result") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg border-2 border-dashed border-teal-400 bg-teal-50/60">
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          {/* Polaroid-style frame hint */}
          <div className="relative flex h-4/5 w-4/5 flex-col rounded bg-white p-2 shadow-md">
            <div className="flex-1 rounded bg-teal-100/80" />
            <div className="mt-2 h-4 rounded bg-teal-50" />
            {/* Corner markers */}
            <div className="absolute left-1 top-1 h-4 w-4 border-l-2 border-t-2 border-teal-400" />
            <div className="absolute right-1 top-1 h-4 w-4 border-r-2 border-t-2 border-teal-400" />
            <div className="absolute bottom-1 left-1 h-4 w-4 border-b-2 border-l-2 border-teal-400" />
            <div className="absolute bottom-1 right-1 h-4 w-4 border-b-2 border-r-2 border-teal-400" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-teal-500">
            📸 Photo Result
          </span>
        </div>
      </div>
    );
  }

  if (node.type === "countdown-overlay") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg border-2 border-dashed border-red-300 bg-zinc-900/70">
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          {/* Pulsing ring */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-400/60">
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30" />
            <span className="font-mono text-4xl font-black text-white/90">
              3
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-red-300">
            ⏱ Countdown Overlay
          </span>
        </div>
      </div>
    );
  }

  if (node.type === "flash-overlay") {
    return (
      <div
        className="relative h-full w-full overflow-hidden rounded-lg border-2 border-dashed border-yellow-300"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,220,0.95) 0%, rgba(255,250,150,0.7) 60%, rgba(234,179,8,0.3) 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-5xl">⚡</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-700">
            Flash Overlay
          </span>
          <span className="text-[8px] text-yellow-600/70">
            Fullscreen white flash on shutter
          </span>
        </div>
      </div>
    );
  }

  if (node.type === "return-countdown") {
    const cdText =
      typeof node.props.countdownText === "string"
        ? node.props.countdownText
        : "Returning to start";
    const cdSecs =
      typeof node.props.countdownSeconds === "number"
        ? node.props.countdownSeconds
        : 8;
    return (
      <div className="flex h-full w-full items-center gap-3 overflow-hidden rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/60 px-3">
        {/* Spinning circular ring — mimics Flutter CircularProgressIndicator */}
        <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
          {/* Background ring */}
          <svg
            viewBox="0 0 28 28"
            className="absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="14"
              cy="14"
              r="11"
              fill="none"
              stroke="#e0e7ff"
              strokeWidth="3"
            />
            <circle
              cx="14"
              cy="14"
              r="11"
              fill="none"
              stroke="#C4121A"
              strokeWidth="3"
              strokeDasharray="69.1"
              strokeDashoffset="17"
              strokeLinecap="round"
              style={{
                animation: "spin 2s linear infinite",
                transformOrigin: "50% 50%",
              }}
            />
          </svg>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
        {/* Text */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-zinc-700">{cdText}</span>
          <span className="text-[10px] text-indigo-400">
            {cdSecs}s · configurable
          </span>
        </div>
      </div>
    );
  }

  if (node.type === "session-countdown") {
    const label = readString(node.props.label, "Session ends in");
    const secs = readNumber(node.props.countdownSeconds, 300);
    const useGlobal = node.props.useGlobal !== false;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    const display =
      mins > 0 ? `${mins}:${String(remSecs).padStart(2, "0")}` : `${secs}s`;
    return (
      <div className="flex h-full w-full items-center gap-3 overflow-hidden rounded-lg border-2 border-dashed border-rose-300 bg-rose-50/70 px-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-rose-500 text-white">
          <span className="text-base">⏱</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-rose-600">
            {label}
          </span>
          <span className="font-mono text-base font-bold tabular-nums text-rose-700">
            {display}
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-rose-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-rose-500">
          {useGlobal ? "global" : "override"}
        </span>
      </div>
    );
  }

  if (node.type === "payment-countdown") {
    const label = readString(node.props.label, "Pay within");
    const secs = readNumber(node.props.countdownSeconds, 60);
    const useGlobal = node.props.useGlobal !== false;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    const display =
      mins > 0 ? `${mins}:${String(remSecs).padStart(2, "0")}` : `${secs}s`;
    return (
      <div className="flex h-full w-full items-center gap-3 overflow-hidden rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/70 px-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-emerald-500 text-white">
          <span className="text-base">💳</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            {label}
          </span>
          <span className="font-mono text-base font-bold tabular-nums text-emerald-700">
            {display}
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-emerald-600">
          {useGlobal ? "global" : "override"}
        </span>
      </div>
    );
  }

  if (node.type === "template-list") {
    const columns =
      typeof node.props.columns === "number" ? node.props.columns : 2;
    const tileCount =
      typeof node.props.tileCount === "number" ? node.props.tileCount : 4;
    const tiles = Array.from({ length: tileCount });
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border-2 border-dashed border-orange-300 bg-orange-50">
        {/* pointer-events-none: inner display content never consumes mouse events */}
        <div className="pointer-events-none absolute inset-0 p-2">
          {/* Grid header */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">
              Template Grid ({columns} cols)
            </span>
            <span className="rounded bg-orange-200 px-1.5 py-0.5 text-[8px] font-semibold text-orange-700">
              template.select
            </span>
          </div>
          {/* Template tiles */}
          <div
            className="grid h-[calc(100%-28px)] gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {tiles.map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm"
              >
                <div className="absolute inset-0 flex flex-col gap-1 p-2">
                  <div className="h-3/4 rounded bg-orange-100" />
                  <div className="h-1/6 rounded bg-orange-50" />
                </div>
                <div className="absolute inset-1 rounded border border-dashed border-orange-300/60" />
                <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-semibold text-orange-400">
                  Frame {i + 1}
                </div>
                {i === 0 && (
                  <div className="absolute inset-0 rounded-lg border-2 border-orange-500 bg-orange-500/10">
                    <div className="absolute right-1 top-1 rounded-full bg-orange-500 p-0.5">
                      <div className="size-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (node.type === "template-preview") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/60">
        {/* pointer-events-none: inner display content never consumes mouse events */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative flex h-4/5 w-3/4 flex-col gap-1 rounded-lg border border-orange-200 bg-white p-2 shadow-md">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 rounded bg-orange-100/80" />
            ))}
            <div className="absolute inset-0 rounded-lg border-4 border-orange-400/30" />
          </div>
          <span className="mt-2 text-[9px] font-bold uppercase tracking-widest text-orange-400">
            Selected Frame Preview
          </span>
        </div>
      </div>
    );
  }

  if (node.type === "qr-placeholder") {
    // Realistic-looking QR placeholder — no real data, just visual structure
    return (
      <div className="grid h-full w-full place-items-center rounded-lg border-2 border-dashed border-zinc-300 bg-white p-3">
        <div className="relative flex size-full flex-col items-center justify-center gap-1">
          {/* Corner squares (finder patterns) */}
          <div className="absolute left-0 top-0 size-8 rounded-sm border-[3px] border-zinc-800 bg-white">
            <div className="m-0.5 size-4 rounded-[2px] bg-zinc-800" />
          </div>
          <div className="absolute right-0 top-0 size-8 rounded-sm border-[3px] border-zinc-800 bg-white">
            <div className="m-0.5 size-4 rounded-[2px] bg-zinc-800" />
          </div>
          <div className="absolute bottom-0 left-0 size-8 rounded-sm border-[3px] border-zinc-800 bg-white">
            <div className="m-0.5 size-4 rounded-[2px] bg-zinc-800" />
          </div>
          {/* Module grid in the middle */}
          <div className="grid w-full max-w-[70%] grid-cols-6 gap-0.5 px-10">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-[1px]",
                  (i * 7 + i) % 5 === 0 ? "bg-zinc-800" : "bg-zinc-200",
                )}
              />
            ))}
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-semibold uppercase tracking-widest text-zinc-400">
            QRIS — dari payment gateway
          </div>
        </div>
      </div>
    );
  }

  if (node.type === "receipt-preview") {
    return (
      <div className="h-full w-full rounded-sm border border-dashed border-zinc-300 bg-white p-5 font-mono text-zinc-950 shadow-xl">
        <div className="text-center text-sm font-bold">
          {readString(node.props.title, "POSKART")}
        </div>
        <div className="my-4 h-28 rounded bg-zinc-100" />
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>DOUBLE PRINT</span>
            <span>10K</span>
          </div>
          <div className="flex justify-between">
            <span>QR DOWNLOAD</span>
            <span>ON</span>
          </div>
          <div className="border-t border-dashed pt-2 text-center">
            {readString(node.props.code, "PK-0000")}
          </div>
        </div>
      </div>
    );
  }

  if (isMediaNode(node)) {
    const src = readString(node.props.src, "");
    const alt = readString(node.props.alt, node.type);
    const radius = readNumber(
      node.props.radius,
      node.type === "background-decoration" ? 0 : 8,
    );
    const objectFit = readString(node.props.objectFit, "cover");

    if (src) {
      return (
        <div
          aria-label={alt}
          role="img"
          className="h-full w-full bg-center"
          style={{
            borderRadius: radius,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: objectFit === "fill" ? "100% 100%" : objectFit,
          }}
        />
      );
    }

    return (
      <div
        className="grid h-full w-full place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-100 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
        style={{ borderRadius: radius }}
      >
        <div>
          <ImageIcon className="mx-auto mb-2 size-5" />
          {node.type}
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        className="h-full w-full resize-none border-none bg-white/80 outline-none"
        style={{
          color,
          fontSize,
          fontWeight: readNumber(node.props.fontWeight, 500),
          fontFamily: readString(
            node.props.fontFamily as string | undefined,
            "inherit",
          ),
          textAlign:
            (node.props.textAlign as React.CSSProperties["textAlign"]) ??
            "left",
          letterSpacing:
            node.props.letterSpacing != null
              ? `${node.props.letterSpacing}px`
              : undefined,
          lineHeight:
            node.props.lineHeight != null
              ? String(node.props.lineHeight)
              : "1.4",
        }}
        value={editValue ?? ""}
        onChange={(event) => onEditChange?.(event.target.value)}
        onBlur={onEditCommit}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onEditCancel?.();
          // Shift+Enter = commit; plain Enter = newline (default textarea)
          if (
            (event.metaKey || event.ctrlKey || event.shiftKey) &&
            event.key === "Enter"
          ) {
            event.preventDefault();
            onEditCommit?.();
          }
        }}
      />
    );
  }

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        color,
        fontSize,
        fontWeight: readNumber(node.props.fontWeight, 500),
        fontStyle: node.props.fontItalic ? "italic" : "normal",
        textDecoration: node.props.fontUnderline ? "underline" : "none",
        fontFamily: readString(
          node.props.fontFamily as string | undefined,
          "inherit",
        ),
        // display: block (not flex) is required for textAlign to work correctly
        textAlign:
          (node.props.textAlign as React.CSSProperties["textAlign"]) ?? "left",
        letterSpacing:
          node.props.letterSpacing != null
            ? `${node.props.letterSpacing}px`
            : undefined,
        lineHeight:
          node.props.lineHeight != null ? String(node.props.lineHeight) : "1.4",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onStartEdit?.();
      }}
    >
      {readString(node.props.content, readString(node.props.label, node.type))}
    </div>
  );
}

function SortableLayer({ node }: { node: BuilderNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.id });
  const selectNode = useBuilderStore((state) => state.selectNode);
  const selectedId = useBuilderStore((state) => state.selectedId);
  const toggleNode = useBuilderStore((state) => state.toggleNode);
  const isSelected = selectedId === node.id;

  const TYPE_COLORS: Record<string, string> = {
    button: "bg-blue-100 text-blue-700",
    text: "bg-purple-100 text-purple-700",
    "social-handle": "bg-purple-100 text-purple-700",
    "camera-view": "bg-zinc-800 text-white",
    "qr-placeholder": "bg-amber-100 text-amber-700",
    qr: "bg-amber-100 text-amber-700",
    image: "bg-emerald-100 text-emerald-700",
    stamp: "bg-emerald-100 text-emerald-700",
    "frame-preview": "bg-emerald-100 text-emerald-700",
    "receipt-preview": "bg-violet-100 text-violet-700",
    "template-list": "bg-orange-100 text-orange-700",
    "template-preview": "bg-orange-50 text-orange-600",
    "background-decoration": "bg-zinc-100 text-zinc-500",
  };
  const badgeClass = TYPE_COLORS[node.type] ?? "bg-zinc-100 text-zinc-500";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
        isSelected
          ? "border-zinc-900 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
      )}
    >
      <button
        className={cn(
          "cursor-grab",
          isSelected ? "text-zinc-400" : "text-zinc-400",
        )}
        {...attributes}
        {...listeners}
      >
        <Grid2X2 className="size-3" />
      </button>
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => selectNode(node.id)}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              isSelected ? "bg-white/15 text-white" : badgeClass,
            )}
          >
            {node.type}
          </span>
          <span
            className={cn(
              "truncate text-[10px]",
              isSelected ? "text-zinc-300" : "text-zinc-400",
            )}
          >
            {node.id}
          </span>
        </div>
      </button>
      <button
        onClick={() => toggleNode(node.id, "visible")}
        className={
          isSelected
            ? "text-zinc-400 hover:text-white"
            : "text-zinc-400 hover:text-zinc-700"
        }
      >
        {node.visible ? (
          <Eye className="size-3" />
        ) : (
          <EyeOff className="size-3" />
        )}
      </button>
      <button
        onClick={() => toggleNode(node.id, "locked")}
        className={
          isSelected
            ? "text-zinc-400 hover:text-white"
            : "text-zinc-400 hover:text-zinc-700"
        }
      >
        {node.locked ? (
          <Lock className="size-3" />
        ) : (
          <Unlock className="size-3" />
        )}
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-zinc-500">
      {label}
      <div className="mt-1 grid grid-cols-[42px_1fr] gap-2">
        <Input
          className="h-9 p-1"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

/** Collapsible accordion section for the Properties Panel */
function PanelSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-zinc-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span
          className={cn(
            "text-zinc-400 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-zinc-100 p-3">{children}</div>
      )}
    </div>
  );
}

function PropertiesPanel({
  selectedNode,
  onStartEdit,
}: {
  selectedNode?: BuilderNode;
  onStartEdit: (node: BuilderNode) => void;
}) {
  const updateNode = useBuilderStore((state) => state.updateNode);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const updateCanvas = useBuilderStore((state) => state.updateCanvas);
  const canvas = useBuilderStore((state) => state.canvas);
  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file?: File) => {
    if (!selectedNode || !file) return;

    setUploading(true);
    try {
      const image = await uploadBuilderImage(file);
      updateNodeProps(selectedNode.id, { src: image.url, alt: file.name });
      toast.success("Image uploaded to Supabase Storage");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload image",
      );
    } finally {
      setUploading(false);
    }
  };

  if (!selectedNode) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
        Select a layer to edit position, typography, colors, radius, shadow,
        opacity, and rotation.
      </div>
    );
  }

  const editableText = isEditableTextNode(selectedNode);
  const mediaNode = isMediaNode(selectedNode);

  return (
    <div className="space-y-2">
      {/* Node header */}
      <div className="flex items-center justify-between py-1">
        <div>
          <div className="text-sm font-semibold capitalize">
            {selectedNode.type}
          </div>
          <div className="text-[10px] font-mono text-zinc-400">
            {selectedNode.id}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => duplicateNode(selectedNode.id)}
          >
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteNode(selectedNode.id)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* Transform */}
      <PanelSection
        title="Transform"
        icon={<Move className="size-3.5 text-zinc-500" />}
      >
        {/* X / Y */}
        <div className="grid grid-cols-2 gap-2">
          {(["x", "y"] as const).map((key) => (
            <label key={key} className="text-xs font-medium text-zinc-500">
              {key.toUpperCase()}
              <Input
                className="mt-1"
                type="number"
                value={selectedNode[key]}
                onChange={(e) =>
                  updateNode(selectedNode.id, { [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        {/* W / [lock] / H inline */}
        <div className="flex items-end gap-1">
          <label className="flex-1 text-xs font-medium text-zinc-500">
            W
            <Input
              className="mt-1"
              type="number"
              value={selectedNode.width}
              onChange={(e) => {
                const w = Number(e.target.value);
                const h = selectedNode.lockAspect
                  ? Math.round(w * (selectedNode.height / selectedNode.width))
                  : selectedNode.height;
                updateNode(selectedNode.id, { width: w, height: h });
              }}
            />
          </label>
          <button
            type="button"
            title={
              selectedNode.lockAspect
                ? "Unlock aspect ratio"
                : "Lock aspect ratio"
            }
            onClick={() =>
              updateNode(selectedNode.id, {
                lockAspect: !selectedNode.lockAspect,
              })
            }
            className={cn(
              "mb-0.5 flex size-7 shrink-0 items-center justify-center rounded border transition-colors",
              selectedNode.lockAspect
                ? "border-zinc-900 bg-zinc-950 text-white"
                : "border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700",
            )}
          >
            <Link2 className="size-3" />
          </button>
          <label className="flex-1 text-xs font-medium text-zinc-500">
            H
            <Input
              className="mt-1"
              type="number"
              value={selectedNode.height}
              onChange={(e) => {
                const h = Number(e.target.value);
                const w = selectedNode.lockAspect
                  ? Math.round(h * (selectedNode.width / selectedNode.height))
                  : selectedNode.width;
                updateNode(selectedNode.id, { width: w, height: h });
              }}
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-500">
          Opacity
          <Slider
            min={0.1}
            max={1}
            step={0.05}
            value={selectedNode.opacity}
            onChange={(e) =>
              updateNode(selectedNode.id, { opacity: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Rotation
          <Input
            className="mt-1"
            type="number"
            value={selectedNode.rotation}
            onChange={(e) =>
              updateNode(selectedNode.id, { rotation: Number(e.target.value) })
            }
          />
        </label>
        {editableText && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onStartEdit(selectedNode)}
          >
            <Type className="size-4" /> Edit text on canvas
          </Button>
        )}
      </PanelSection>

      {/* Text */}
      {editableText && (
        <PanelSection
          title="Text"
          icon={<Type className="size-3.5 text-zinc-500" />}
        >
          <label className="block text-xs font-medium text-zinc-500">
            Content
            <Input
              className="mt-1"
              value={readString(
                selectedNode.props.content,
                readString(selectedNode.props.label, ""),
              )}
              onChange={(e) =>
                updateNodeProps(
                  selectedNode.id,
                  selectedNode.type === "button"
                    ? { label: e.target.value }
                    : { content: e.target.value },
                )
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Font family
            <Select
              className="mt-1"
              value={readString(
                selectedNode.props.fontFamily as string | undefined,
                "",
              )}
              onChange={(e) =>
                updateNodeProps(selectedNode.id, {
                  fontFamily: e.target.value || "inherit",
                })
              }
            >
              <option value="">System default</option>
              <optgroup label="Google Fonts">
                <option value="Inter, sans-serif">Inter</option>
                <option value="Outfit, sans-serif">Outfit</option>
                <option value="DM Sans, sans-serif">DM Sans</option>
                <option value="Nunito, sans-serif">Nunito</option>
                <option value="Playfair Display, serif">
                  Playfair Display
                </option>
                <option value="Lora, serif">Lora</option>
                <option value="'Courier New', monospace">Courier New</option>
              </optgroup>
              {(canvas.customFonts ?? []).length > 0 && (
                <optgroup label="Custom fonts">
                  {(canvas.customFonts ?? []).map((cf) => (
                    <option key={cf.name} value={`'${cf.name}', sans-serif`}>
                      {cf.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </label>
          {/* Custom font import */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
            <div className="mb-1.5 font-semibold text-zinc-600">
              🔗 Import custom font
            </div>
            <label className="block text-zinc-500">
              Font name
              <Input
                className="mt-0.5"
                placeholder="e.g. MyBrand"
                id="custom-font-name"
              />
            </label>
            <label className="mt-1 block text-zinc-500">
              CSS URL (Google Fonts / CDN)
              <Input
                className="mt-0.5"
                placeholder="https://fonts.googleapis.com/css2?family=..."
                id="custom-font-url"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const nameEl = document.getElementById(
                  "custom-font-name",
                ) as HTMLInputElement | null;
                const urlEl = document.getElementById(
                  "custom-font-url",
                ) as HTMLInputElement | null;
                const name = nameEl?.value.trim();
                const url = urlEl?.value.trim();
                if (!name || !url) return;
                // Inject <link> tag to load the font
                const id = `custom-font-${name}`;
                if (!document.getElementById(id)) {
                  const link = document.createElement("link");
                  link.id = id;
                  link.rel = "stylesheet";
                  link.href = url;
                  document.head.appendChild(link);
                }
                // Save to canvas
                const existing = canvas.customFonts ?? [];
                if (!existing.find((f) => f.name === name)) {
                  updateCanvas({ customFonts: [...existing, { name, url }] });
                }
                if (nameEl) nameEl.value = "";
                if (urlEl) urlEl.value = "";
              }}
              className="mt-1.5 w-full rounded bg-zinc-800 py-1 text-[10px] font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              + Load font
            </button>
            {(canvas.customFonts ?? []).length > 0 && (
              <div className="mt-2 space-y-0.5">
                {(canvas.customFonts ?? []).map((cf) => (
                  <div
                    key={cf.name}
                    className="flex items-center justify-between rounded bg-white px-1.5 py-0.5 text-[10px] text-zinc-600"
                  >
                    <span style={{ fontFamily: `'${cf.name}', sans-serif` }}>
                      {cf.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCanvas({
                          customFonts: (canvas.customFonts ?? []).filter(
                            (f) => f.name !== cf.name,
                          ),
                        })
                      }
                      className="text-zinc-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs font-medium text-zinc-500">
            Alignment
            <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 p-0.5">
              {(
                [
                  { align: "left", icon: <AlignLeft className="size-3.5" /> },
                  {
                    align: "center",
                    icon: <AlignCenter className="size-3.5" />,
                  },
                  { align: "right", icon: <AlignRight className="size-3.5" /> },
                  {
                    align: "justify",
                    icon: <AlignJustify className="size-3.5" />,
                  },
                ] as const
              ).map(({ align, icon }) => {
                const current = readString(
                  selectedNode.props.textAlign as string | undefined,
                  "left",
                );
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() =>
                      updateNodeProps(selectedNode.id, { textAlign: align })
                    }
                    className={cn(
                      "flex flex-1 items-center justify-center rounded py-1 transition-colors",
                      current === align
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-500 hover:bg-zinc-100",
                    )}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
            {/* Bold / Italic / Underline */}
            <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 p-0.5">
              {(
                [
                  {
                    key: "fontWeight",
                    onVal: 700,
                    offVal: 400,
                    label: "B",
                    title: "Bold",
                    cls: "font-bold",
                  },
                ] as const
              ).map(({ key, onVal, offVal, label, title, cls }) => (
                <button
                  key={key}
                  type="button"
                  title={title}
                  onClick={() =>
                    updateNodeProps(selectedNode.id, {
                      [key]:
                        readNumber(selectedNode.props[key], 400) >= 700
                          ? offVal
                          : onVal,
                    })
                  }
                  className={cn(
                    "flex flex-1 items-center justify-center rounded py-1 text-xs transition-colors",
                    cls,
                    readNumber(selectedNode.props.fontWeight, 400) >= 700
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-500 hover:bg-zinc-100",
                  )}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                title="Italic"
                onClick={() =>
                  updateNodeProps(selectedNode.id, {
                    fontItalic: !selectedNode.props.fontItalic,
                  })
                }
                className={cn(
                  "flex flex-1 items-center justify-center rounded py-1 text-xs italic transition-colors",
                  selectedNode.props.fontItalic
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                I
              </button>
              <button
                type="button"
                title="Underline"
                onClick={() =>
                  updateNodeProps(selectedNode.id, {
                    fontUnderline: !selectedNode.props.fontUnderline,
                  })
                }
                className={cn(
                  "flex flex-1 items-center justify-center rounded py-1 text-xs underline transition-colors",
                  selectedNode.props.fontUnderline
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                U
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">
              Font size
              <Input
                className="mt-1"
                type="number"
                value={readNumber(
                  selectedNode.props.fontSize,
                  selectedNode.type === "button" ? 14 : 18,
                )}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    fontSize: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Weight
              <Input
                className="mt-1"
                type="number"
                step={100}
                value={readNumber(
                  selectedNode.props.fontWeight,
                  selectedNode.type === "button" ? 600 : 500,
                )}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    fontWeight: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Letter spacing
              <Input
                className="mt-1"
                type="number"
                step={0.5}
                placeholder="0"
                value={
                  selectedNode.props.letterSpacing != null
                    ? String(selectedNode.props.letterSpacing)
                    : ""
                }
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    letterSpacing:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Line height
              <Input
                className="mt-1"
                type="number"
                step={0.1}
                placeholder="1.4"
                value={
                  selectedNode.props.lineHeight != null
                    ? String(selectedNode.props.lineHeight)
                    : ""
                }
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    lineHeight:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <ColorField
            label={selectedNode.type === "button" ? "Text color" : "Color"}
            value={readString(
              selectedNode.props.color,
              selectedNode.type === "button" ? "#ffffff" : "#18181b",
            )}
            onChange={(v) => updateNodeProps(selectedNode.id, { color: v })}
          />
        </PanelSection>
      )}

      {/* Button */}
      {selectedNode.type === "button" && (
        <PanelSection
          title="Button"
          icon={<PaintBucket className="size-3.5 text-zinc-500" />}
        >
          <ColorField
            label="Button color"
            value={readString(selectedNode.props.background, "#18181b")}
            onChange={(v) =>
              updateNodeProps(selectedNode.id, { background: v })
            }
          />
          <label className="text-xs font-medium text-zinc-500">
            Radius
            <Input
              className="mt-1"
              type="number"
              value={readNumber(selectedNode.props.radius, 6)}
              onChange={(e) =>
                updateNodeProps(selectedNode.id, {
                  radius: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            <div className="mb-1 flex items-center gap-1.5">
              Semantic Role
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                Flutter binding
              </span>
            </div>
            <Select
              className="mt-0 font-mono text-xs"
              value={readString(
                (selectedNode.props.semanticRole as string | undefined) ?? "",
                "",
              )}
              onChange={(e) =>
                updateNodeProps(selectedNode.id, {
                  semanticRole: e.target.value || null,
                })
              }
            >
              <option value="">— unassigned —</option>
              {(() => {
                const pageRoleValues =
                  PAGE_ROLES[selectedNode.page as keyof typeof PAGE_ROLES] ??
                  [];
                const pageRoles = SEMANTIC_ROLES.filter((r) =>
                  pageRoleValues.includes(r.value),
                );
                const genericRoles = SEMANTIC_ROLES.filter(
                  (r) => r.screen === "generic",
                );
                return (
                  <>
                    {pageRoles.length > 0 && (
                      <optgroup label={`📄 ${selectedNode.page}`}>
                        {pageRoles.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="generic">
                      {genericRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </optgroup>
                  </>
                );
              })()}
            </Select>
            <div className="mt-1.5 text-[10px] leading-4 text-zinc-400">
              Flutter maps this role to the correct action handler.
            </div>
          </label>
          {/* SVG Icon */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
            <div className="mb-1.5 font-semibold text-zinc-600">
              🎨 Icon (SVG)
            </div>
            {/* Preview */}
            {typeof selectedNode.props.iconSvg === "string" &&
              selectedNode.props.iconSvg && (
                <div className="mb-2 flex items-center gap-2 rounded border border-zinc-200 bg-white p-2">
                  <span
                    className="shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: readString(selectedNode.props.color, "#ffffff"),
                    }}
                    dangerouslySetInnerHTML={{
                      __html: selectedNode.props.iconSvg as string,
                    }}
                  />
                  <span className="flex-1 truncate font-mono text-[10px] text-zinc-400">
                    SVG loaded
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateNodeProps(selectedNode.id, { iconSvg: null })
                    }
                    className="text-zinc-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              )}
            {/* Paste SVG */}
            <label className="block text-zinc-500">
              Paste SVG markup
              <textarea
                rows={3}
                placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>'
                className="mt-0.5 w-full resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 font-mono text-[10px] text-zinc-700 outline-none focus:border-zinc-400"
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val.startsWith("<svg"))
                    updateNodeProps(selectedNode.id, { iconSvg: val });
                }}
              />
            </label>
            {/* Upload .svg file */}
            <label className="mt-1 flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-zinc-300 px-2 py-1 text-[10px] text-zinc-500 hover:border-zinc-400 hover:bg-white">
              <Upload className="size-3" />
              Upload .svg file
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string;
                    if (text?.trim().startsWith("<svg")) {
                      updateNodeProps(selectedNode.id, {
                        iconSvg: text.trim(),
                      });
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
            </label>
            {/* Icon position */}
            <div className="mt-2 text-zinc-500">
              Position
              <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5">
                {(["left", "right", "top", "bottom", "only"] as const).map(
                  (pos) => (
                    <button
                      key={pos}
                      type="button"
                      title={
                        pos === "only" ? "Icon only (no text)" : `Icon ${pos}`
                      }
                      onClick={() =>
                        updateNodeProps(selectedNode.id, { iconPosition: pos })
                      }
                      className={cn(
                        "flex flex-1 items-center justify-center rounded py-1 text-[10px] font-medium transition-colors",
                        (selectedNode.props.iconPosition ?? "left") === pos
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-500 hover:bg-zinc-100",
                      )}
                    >
                      {pos === "left"
                        ? "◄ T"
                        : pos === "right"
                          ? "T ►"
                          : pos === "top"
                            ? "▲"
                            : pos === "bottom"
                              ? "▼"
                              : "●"}
                    </button>
                  ),
                )}
              </div>
              <div className="mt-0.5 text-[9px] text-zinc-400">
                ◄T left   T► right   ▲ top   ▼ bottom   ● icon only
              </div>
            </div>
            {/* Icon size */}
            <label className="mt-1.5 block text-zinc-500">
              Icon size (px)
              <Input
                className="mt-0.5"
                type="number"
                min={10}
                max={96}
                value={readNumber(selectedNode.props.iconSize, 20)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    iconSize: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
        </PanelSection>
      )}

      {/* Image */}
      {mediaNode && (
        <PanelSection
          title="Image"
          icon={<ImageIcon className="size-3.5 text-zinc-500" />}
        >
          <label className="block text-xs font-medium text-zinc-500">
            Source URL
            <Input
              className="mt-1"
              value={readString(selectedNode.props.src, "")}
              placeholder="https://..."
              onChange={(e) =>
                updateNodeProps(selectedNode.id, { src: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Upload image
            <Input
              className="mt-1"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              disabled={uploading}
              onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">
              Fit
              <Select
                className="mt-1"
                value={readString(selectedNode.props.objectFit, "cover")}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    objectFit: e.target.value,
                  })
                }
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </Select>
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Radius
              <Input
                className="mt-1"
                type="number"
                value={readNumber(selectedNode.props.radius, 8)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    radius: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          {uploading && (
            <div className="text-xs text-zinc-500">Uploading image...</div>
          )}
        </PanelSection>
      )}

      {/* Generic color/radius for non-text, non-media nodes */}
      {!editableText && !mediaNode && (
        <PanelSection
          title="Appearance"
          icon={<PaintBucket className="size-3.5 text-zinc-500" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">
              Color
              <Input
                className="mt-1"
                value={readString(selectedNode.props.color, "#18181b")}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, { color: e.target.value })
                }
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Radius
              <Input
                className="mt-1"
                type="number"
                value={readNumber(selectedNode.props.radius, 6)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    radius: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
        </PanelSection>
      )}

      {/* Return Countdown */}
      {selectedNode.type === "return-countdown" && (
        <PanelSection
          title="Return Countdown"
          icon={<span className="text-sm">⏳</span>}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Display text
              <Input
                className="mt-1"
                value={readString(
                  selectedNode.props.countdownText,
                  "Returning to start",
                )}
                placeholder="Returning to start"
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    countdownText: e.target.value,
                  })
                }
              />
            </label>
            <label className="block">
              Countdown duration (seconds)
              <Input
                className="mt-1"
                type="number"
                min={3}
                max={60}
                value={readNumber(selectedNode.props.countdownSeconds, 8)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    countdownSeconds: Number(e.target.value),
                  })
                }
              />
            </label>
            <div className="rounded border border-indigo-200 bg-indigo-50 p-2 text-[10px] text-indigo-600 leading-4">
              <strong>Flutter:</strong> after this many seconds on the Thanks
              screen, the app auto-navigates back to Landing. The spinner and
              text are rendered at this node&apos;s position and size.
            </div>
          </div>
        </PanelSection>
      )}

      {/* Session Countdown */}
      {selectedNode.type === "session-countdown" && (
        <PanelSection
          title="Session Countdown"
          icon={<span className="text-sm">⏱</span>}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Label
              <Input
                className="mt-1"
                value={readString(selectedNode.props.label, "Session ends in")}
                placeholder="Session ends in"
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, { label: e.target.value })
                }
              />
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selectedNode.props.useGlobal !== false}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    useGlobal: e.target.checked,
                  })
                }
              />
              <span>
                Use booth/global value
                <span className="block text-[10px] text-zinc-400">
                  When checked, Flutter reads the booth&apos;s
                  `session_countdown_seconds` (or app_config fallback).
                </span>
              </span>
            </label>
            <label className="block">
              Override duration (seconds)
              <Input
                className="mt-1"
                type="number"
                min={30}
                max={1800}
                disabled={selectedNode.props.useGlobal !== false}
                value={readNumber(selectedNode.props.countdownSeconds, 300)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    countdownSeconds: Number(e.target.value),
                  })
                }
              />
            </label>
            <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-600 leading-4">
              <strong>Flutter:</strong> total time across template → camera →
              preview → thanks. When the timer hits 0, the app auto-returns to
              Landing.
            </div>
          </div>
        </PanelSection>
      )}

      {/* Payment Countdown */}
      {selectedNode.type === "payment-countdown" && (
        <PanelSection
          title="Payment Countdown"
          icon={<span className="text-sm">💳</span>}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Label
              <Input
                className="mt-1"
                value={readString(selectedNode.props.label, "Pay within")}
                placeholder="Pay within"
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, { label: e.target.value })
                }
              />
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selectedNode.props.useGlobal !== false}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    useGlobal: e.target.checked,
                  })
                }
              />
              <span>
                Use booth/global value
                <span className="block text-[10px] text-zinc-400">
                  When checked, Flutter reads the booth&apos;s
                  `payment_countdown_seconds`.
                </span>
              </span>
            </label>
            <label className="block">
              Override duration (seconds)
              <Input
                className="mt-1"
                type="number"
                min={10}
                max={600}
                disabled={selectedNode.props.useGlobal !== false}
                value={readNumber(selectedNode.props.countdownSeconds, 60)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    countdownSeconds: Number(e.target.value),
                  })
                }
              />
            </label>
            <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-700 leading-4">
              <strong>Flutter:</strong> when the QRIS payment timer reaches 0,
              the payment dialog cancels and returns to Landing.
            </div>
          </div>
        </PanelSection>
      )}
    </div>
  );
}

function CanvasControls() {
  const canvas = useBuilderStore((state) => state.canvas);
  const activePage = useBuilderStore((state) => state.activePage);
  const updateCanvas = useBuilderStore((state) => state.updateCanvas);
  const setPageBackground = useBuilderStore((state) => state.setPageBackground);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolved background for the current page
  const pageBg = canvas.pageBackgrounds?.[activePage];
  const bgImage = pageBg?.image;
  const bgVideo = pageBg?.video;

  const applyOrientation = (orientation: "portrait" | "landscape") => {
    updateCanvas(
      orientation === "portrait"
        ? { orientation, width: 1080, height: 1920 }
        : { orientation, width: 1920, height: 1080 },
    );
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadBuilderMedia(file);
      if (result.type === "video") {
        setPageBackground(activePage, { image: undefined, video: result.url });
      } else {
        setPageBackground(activePage, { image: result.url, video: undefined });
      }
      toast.success(
        `${result.type === "video" ? "Video" : "Image"} background set for ${activePage}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearBg = () =>
    setPageBackground(activePage, { image: undefined, video: undefined });
  const hasBg = !!(bgImage || bgVideo);

  const DEVICE_PRESETS = [
    { label: "— Custom —", w: 0, h: 0 },
    { label: "Redmi Pad 2", w: 2560, h: 1600 },
    { label: "Redmi Pad SE", w: 1920, h: 1200 },
    { label: "iPad 10th Gen", w: 1668, h: 2388 },
    { label: "iPad Air M2", w: 1640, h: 2360 },
    { label: 'iPad Pro 11"', w: 1668, h: 2420 },
    { label: "Samsung Tab A7", w: 1200, h: 2000 },
    { label: "Samsung Tab A8", w: 1340, h: 2000 },
    { label: "Phone FHD+", w: 1080, h: 2400 },
  ];

  // Find active preset (match either portrait or landscape orientation of that device)
  const activePreset = DEVICE_PRESETS.find(
    (p) =>
      p.w > 0 &&
      ((canvas.width === p.w && canvas.height === p.h) ||
        (canvas.width === p.h && canvas.height === p.w)),
  );
  const selectedPresetValue = activePreset?.label ?? "";

  const applyPreset = (label: string) => {
    const p = DEVICE_PRESETS.find((d) => d.label === label);
    if (!p || p.w === 0) return;
    // Apply in current orientation preference
    const isLandscape = canvas.orientation === "landscape";
    const w = isLandscape ? Math.max(p.w, p.h) : Math.min(p.w, p.h);
    const h = isLandscape ? Math.min(p.w, p.h) : Math.max(p.w, p.h);
    updateCanvas({
      width: w,
      height: h,
      orientation: w >= h ? "landscape" : "portrait",
    });
  };

  const applyOrientationWithPreset = (
    orientation: "portrait" | "landscape",
  ) => {
    if (activePreset && activePreset.w > 0) {
      const w =
        orientation === "landscape"
          ? Math.max(activePreset.w, activePreset.h)
          : Math.min(activePreset.w, activePreset.h);
      const h =
        orientation === "landscape"
          ? Math.min(activePreset.w, activePreset.h)
          : Math.max(activePreset.w, activePreset.h);
      updateCanvas({ width: w, height: h, orientation });
    } else {
      applyOrientation(orientation);
    }
  };

  return (
    <PanelSection
      title="Canvas"
      icon={<Smartphone className="size-3.5 text-zinc-500" />}
    >
      {/* Canvas Mode toggle */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-zinc-500">Mode</div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-0.5">
          <button
            onClick={() => updateCanvas({ overlayMode: false })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              !canvas.overlayMode
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Type className="size-3.5" /> Custom
          </button>
          <button
            onClick={() => updateCanvas({ overlayMode: true })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              canvas.overlayMode
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Grid2X2 className="size-3.5" /> Overlay
          </button>
        </div>
        {canvas.overlayMode && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
            <strong>Overlay mode</strong> — set semantic roles so Flutter knows
            where each widget goes.
          </div>
        )}
      </div>

      {/* Device preset dropdown */}
      <label className="block text-xs font-medium text-zinc-500">
        Device
        <Select
          className="mt-1"
          value={selectedPresetValue}
          onChange={(e) => applyPreset(e.target.value)}
        >
          {DEVICE_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
              {p.w > 0 ? ` (${p.w}×${p.h})` : ""}
            </option>
          ))}
        </Select>
      </label>

      {/* Orientation */}
      <label className="block text-xs font-medium text-zinc-500">
        Orientation
        <Select
          className="mt-1"
          value={canvas.orientation}
          onChange={(e) =>
            applyOrientationWithPreset(
              e.target.value as "portrait" | "landscape",
            )
          }
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </Select>
      </label>

      {/* Manual size */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          W px
          <Input
            className="mt-1"
            min={240}
            max={3840}
            type="number"
            value={canvas.width}
            onChange={(e) => updateCanvas({ width: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          H px
          <Input
            className="mt-1"
            min={240}
            max={3840}
            type="number"
            value={canvas.height}
            onChange={(e) => updateCanvas({ height: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* App background */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "text-xs font-medium",
              activePage === "payment" ? "text-amber-600" : "text-zinc-500",
            )}
          >
            {activePage === "payment" ? "Dialog background" : "Background"}
          </div>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 capitalize">
            {activePage}
          </span>
        </div>
        {activePage === "payment" && (
          <p className="text-[10px] text-amber-600 leading-snug">
            This sets the <strong>dialog card</strong> background. The backdrop
            uses the landing page bg.
          </p>
        )}

        {bgVideo ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            <video
              src={bgVideo}
              autoPlay
              loop
              muted
              playsInline
              className="h-24 w-full object-cover"
            />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <Film className="size-2.5" /> VIDEO
              </span>
              <button
                onClick={clearBg}
                className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : bgImage ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgImage} alt="bg" className="h-24 w-full object-cover" />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <ImageIcon className="size-2.5" /> IMAGE
              </span>
              <button
                onClick={clearBg}
                className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : null}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed py-3 text-center transition-colors",
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-zinc-200 bg-zinc-50 hover:border-zinc-300",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Upload className="size-3.5 text-zinc-400" />
          <div className="text-[10px] font-medium text-zinc-600">
            {uploading ? "Uploading…" : hasBg ? "Replace" : "Upload design"}
          </div>
          <div className="text-[9px] text-zinc-400">
            Image / Video (MP4/WebM)
          </div>
        </div>

        <label className="block text-xs font-medium text-zinc-500">
          Or paste URL
          <Input
            className="mt-1 font-mono text-[11px]"
            placeholder="https://…"
            value={bgImage ?? bgVideo ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const isVideo = /\.(mp4|webm|mov)($|\?)/i.test(v);
              if (isVideo)
                setPageBackground(activePage, {
                  video: v || undefined,
                  image: undefined,
                });
              else
                setPageBackground(activePage, {
                  image: v || undefined,
                  video: undefined,
                });
            }}
          />
        </label>
      </div>

      {!canvas.overlayMode && (
        <ColorField
          label="Background color"
          value={canvas.backgroundColor ?? "#ffffff"}
          onChange={(value) => updateCanvas({ backgroundColor: value })}
        />
      )}

      {/* Payment Dialog size settings */}
      {activePage === "payment" && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
            Payment Dialog Size
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Width ratio
            <span className="ml-auto float-right text-zinc-400">
              {Math.round((canvas.paymentModal?.widthRatio ?? 0.65) * 100)}%
            </span>
            <Slider
              className="mt-1"
              min={30}
              max={95}
              step={1}
              value={String(
                Math.round((canvas.paymentModal?.widthRatio ?? 0.65) * 100),
              )}
              onChange={(e) =>
                updateCanvas({
                  paymentModal: {
                    ...(canvas.paymentModal ?? {
                      heightRatio: 0.75,
                      borderRadius: 20,
                    }),
                    widthRatio: Number(e.target.value) / 100,
                  },
                })
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Height ratio
            <span className="ml-auto float-right text-zinc-400">
              {Math.round((canvas.paymentModal?.heightRatio ?? 0.75) * 100)}%
            </span>
            <Slider
              className="mt-1"
              min={30}
              max={95}
              step={1}
              value={String(
                Math.round((canvas.paymentModal?.heightRatio ?? 0.75) * 100),
              )}
              onChange={(e) =>
                updateCanvas({
                  paymentModal: {
                    ...(canvas.paymentModal ?? {
                      widthRatio: 0.65,
                      borderRadius: 20,
                    }),
                    heightRatio: Number(e.target.value) / 100,
                  },
                })
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Corner radius
            <span className="ml-auto float-right text-zinc-400">
              {canvas.paymentModal?.borderRadius ?? 20}px
            </span>
            <Slider
              className="mt-1"
              min={0}
              max={60}
              step={1}
              value={String(canvas.paymentModal?.borderRadius ?? 20)}
              onChange={(e) =>
                updateCanvas({
                  paymentModal: {
                    ...(canvas.paymentModal ?? {
                      widthRatio: 0.65,
                      heightRatio: 0.75,
                    }),
                    borderRadius: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <p className="text-[10px] text-amber-600">
            Dialog coords are <strong>full-screen relative</strong>. Place nodes
            on top of the white card.
          </p>
        </div>
      )}
    </PanelSection>
  );
}

function BuilderContextMenu({
  x,
  y,
  node,
  onClose,
  onEditText,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleVisible,
  onBringToFront,
  onSendToBack,
  onAddNode,
}: {
  x: number;
  y: number;
  node?: BuilderNode;
  onClose: () => void;
  onEditText: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onAddNode: (type: BuilderComponentType) => void;
}) {
  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-zinc-100";

  return (
    <div
      className="fixed z-50 w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-2xl"
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {node ? (
        <>
          <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            {node.type}
          </div>
          {isEditableTextNode(node) ? (
            <button type="button" className={itemClass} onClick={onEditText}>
              <Type className="size-3.5" />
              Edit text
            </button>
          ) : null}
          <button type="button" className={itemClass} onClick={onDuplicate}>
            <Copy className="size-3.5" />
            Duplicate
          </button>
          <button type="button" className={itemClass} onClick={onBringToFront}>
            <BringToFront className="size-3.5" />
            Bring to front
          </button>
          <button type="button" className={itemClass} onClick={onSendToBack}>
            <SendToBack className="size-3.5" />
            Send to back
          </button>
          <button type="button" className={itemClass} onClick={onToggleVisible}>
            {node.visible ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {node.visible ? "Hide" : "Show"}
          </button>
          <button type="button" className={itemClass} onClick={onToggleLock}>
            {node.locked ? (
              <Unlock className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            {node.locked ? "Unlock" : "Lock"}
          </button>
          <div className="my-1 h-px bg-zinc-100" />
          <button
            type="button"
            className={cn(itemClass, "text-red-600 hover:bg-red-50")}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </>
      ) : (
        <>
          <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Add component
          </div>
          {(
            [
              "text",
              "button",
              "image",
              "background-decoration",
            ] as BuilderComponentType[]
          ).map((type) => (
            <button
              key={type}
              type="button"
              className={itemClass}
              onClick={() => onAddNode(type)}
            >
              <Plus className="size-3.5" />
              {type}
            </button>
          ))}
        </>
      )}
      <button
        type="button"
        className={cn(itemClass, "mt-1 text-zinc-500")}
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
}

export function VisualBuilder() {
  const sensors = useSensors(useSensor(PointerSensor));
  const activePage = useBuilderStore((state) => state.activePage);
  const setActivePage = useBuilderStore((state) => state.setActivePage);
  const selectedId = useBuilderStore((state) => state.selectedId);
  const selectedIds = useBuilderStore((state) => state.selectedIds);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const selectNodes = useBuilderStore((state) => state.selectNodes);
  const deleteSelected = useBuilderStore((state) => state.deleteSelected);
  const canvas = useBuilderStore((state) => state.canvas);
  const nodes = useBuilderStore((state) => state.nodes);
  const updateNode = useBuilderStore((state) => state.updateNode);
  const updateCanvas = useBuilderStore((state) => state.updateCanvas);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const addNode = useBuilderStore((state) => state.addNode);
  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const toggleNode = useBuilderStore((state) => state.toggleNode);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const reorderNodes = useBuilderStore((state) => state.reorderNodes);
  const resetPageNodes = useBuilderStore((state) => state.resetPageNodes);
  const schema = useBuilderStore((state) => state.schema);
  const setSchema = useBuilderStore((state) => state.setSchema);
  const { data: savedLayout } = useActiveLayoutSchema();
  const hydratedLayoutId = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [themeName, setThemeName] = useState("");
  const saveLayoutMutation = useSaveLayoutAsTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);

  // ── Auto-save & Load ────────────────────────────────
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(
    () => getAutoSave()?.savedAt ?? null,
  );
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadTab, setLoadTab] = useState<"local" | "db">("local");
  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>([]);
  const { data: dbThemes = [] } = useLayoutSchemas();
  const [loadSearch, setLoadSearch] = useState("");
  /** The DB id of the currently loaded/saved theme — null when working on unsaved canvas */
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(null);
  const [currentThemeName, setCurrentThemeName] = useState<string | null>(null);

  // Re-inject custom font <link> tags whenever canvas.customFonts changes
  useEffect(() => {
    (canvas.customFonts ?? []).forEach(({ name, url }) => {
      const id = `custom-font-${name}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = url;
        document.head.appendChild(link);
      }
    });
  }, [canvas.customFonts]);

  // Auto-save to localStorage — debounced 3s after any schema change
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSaveSchema(schema());
      setLastAutoSave(new Date().toISOString());
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(schema())]);

  // Ctrl+S — save (update if has DB id, else open dialog)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName ?? "",
        ) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !isTyping) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentThemeId]);

  /** Save: update existing DB theme if currentThemeId set, else open New dialog */
  async function handleSave() {
    autoSaveSchema(schema());
    setLastAutoSave(new Date().toISOString());
    if (currentThemeId && currentThemeName) {
      setIsSaving(true);
      try {
        await saveLayoutMutation.mutateAsync({
          name: currentThemeName,
          schema: schema(),
          existingId: currentThemeId,
        });
        toast.success(`“${currentThemeName}” saved!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        setIsSaving(false);
      }
    } else {
      // No current theme — open dialog to name + create
      setThemeName("");
      setShowSaveDialog(true);
    }
  }

  function handleLoadSchema(
    s: import("@/types/builder").LayoutSchema,
    opts?: { themeId?: string; themeName?: string },
  ) {
    setSchema(s);
    setCurrentThemeId(opts?.themeId ?? null);
    setCurrentThemeName(opts?.themeName ?? null);
    setShowLoadDialog(false);
    toast.success(
      opts?.themeId ? `Loaded “${opts.themeName ?? "theme"}”` : "Draft loaded!",
    );
  }

  function handleDeleteLocalDraft(id: string) {
    deleteDraft(id);
    setLocalDrafts(getDrafts());
  }
  // ── end Auto-save & Load ─────────────────────────────

  // ── Zoom / Pan ────────────────────────────────────────────
  const [zoom, setZoom] = useState(0.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const spaceRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const clampZoom = useCallback(
    (z: number) => Math.min(4, Math.max(0.1, z)),
    [],
  );

  /** Fit canvas in viewport with padding — like Figma Shift+1 */
  const fitToScreen = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    const padding = 80;
    const scaleX = (vpW - padding * 2) / canvas.width;
    const scaleY = (vpH - padding * 2) / canvas.height;
    const newZoom = clampZoom(Math.min(scaleX, scaleY));
    setZoom(newZoom);
    setPan({ x: 0, y: 0 }); // centered — transform origin is center center
  }, [canvas.width, canvas.height, clampZoom]);

  /** Center viewport on a node (pan only, no zoom change) */
  const panToNode = useCallback(
    (nodeId: string) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      // Node center in canvas space → offset from canvas center
      const nodeCxInCanvas = node.x + node.width / 2 - canvas.width / 2;
      const nodeCyInCanvas = node.y + node.height / 2 - canvas.height / 2;
      setPan({ x: -nodeCxInCanvas * zoom, y: -nodeCyInCanvas * zoom });
    },
    [nodes, canvas.width, canvas.height, zoom],
  );

  // Fit canvas on first mount
  useEffect(() => {
    fitToScreen();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.08 : 0.93;
        setZoom((z) => clampZoom(z * factor));
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampZoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName ?? "",
        ) || (e.target as HTMLElement)?.isContentEditable;
      if (e.code === "Space" && !e.repeat && !isTyping) spaceRef.current = true;
    };
    const offKey = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", offKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", offKey);
    };
  }, []);

  // Keyboard shortcuts: Shift+1=fit, Shift+2=100%, F=pan to selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName ?? "",
        ) || (e.target as HTMLElement)?.isContentEditable;
      if (isTyping) return;
      if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        fitToScreen();
      }
      if (e.shiftKey && e.key === "2") {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
      if (e.key === "f" || e.key === "F") {
        if (selectedId) {
          e.preventDefault();
          panToNode(selectedId);
        } else {
          e.preventDefault();
          fitToScreen();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fitToScreen, panToNode, selectedId]);

  // ── Box selection ──────────────────────────────────────
  const [boxSelect, setBoxSelect] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const boxSelectRef = useRef(false);

  const canvasToClient = (cx: number, cy: number) => {
    const el = viewportRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return {
      x: centerX + (cx - canvas.width / 2) * zoom + pan.x,
      y: centerY + (cy - canvas.height / 2) * zoom + pan.y,
    };
  };

  const clientToCanvas = (clientX: number, clientY: number) => {
    const el = viewportRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return {
      x: (clientX - centerX - pan.x) / zoom + canvas.width / 2,
      y: (clientY - centerY - pan.y) / zoom + canvas.height / 2,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || spaceRef.current) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        mx: e.clientX,
        my: e.clientY,
        px: pan.x,
        py: pan.y,
      };
      return;
    }
    // Only start box-select when clicking the canvas background directly (not a node)
    if ((e.target as HTMLElement).closest(".rnd-node")) return;
    boxSelectRef.current = true;
    const pos = clientToCanvas(e.clientX, e.clientY);
    setBoxSelect({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
    if (!e.shiftKey) selectNode(null);
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setPan({
        x: panStartRef.current.px + (e.clientX - panStartRef.current.mx),
        y: panStartRef.current.py + (e.clientY - panStartRef.current.my),
      });
    }
    if (boxSelectRef.current && boxSelect) {
      const pos = clientToCanvas(e.clientX, e.clientY);
      setBoxSelect((b) => (b ? { ...b, endX: pos.x, endY: pos.y } : null));
    }
  };
  const handleCanvasMouseUp = () => {
    isPanningRef.current = false;
    if (boxSelectRef.current && boxSelect) {
      boxSelectRef.current = false;
      const x1 = Math.min(boxSelect.startX, boxSelect.endX);
      const y1 = Math.min(boxSelect.startY, boxSelect.endY);
      const x2 = Math.max(boxSelect.startX, boxSelect.endX);
      const y2 = Math.max(boxSelect.startY, boxSelect.endY);
      // Only trigger selection if the rect is meaningful (> 4px)
      if (x2 - x1 > 4 || y2 - y1 > 4) {
        const hit = visibleNodes
          .filter(
            (n) =>
              n.x < x2 && n.x + n.width > x1 && n.y < y2 && n.y + n.height > y1,
          )
          .map((n) => n.id);
        if (hit.length > 0) selectNodes(hit);
      }
      setBoxSelect(null);
    }
  };
  // ── end Zoom/Pan + BoxSelect ──────────────────────────────

  const visibleNodes = nodes
    .filter((node) => node.page === activePage)
    .sort((a, b) => a.zIndex - b.zIndex);
  const selectedNode = nodes.find((node) => node.id === selectedId);
  const contextNode = contextMenu?.nodeId
    ? nodes.find((node) => node.id === contextMenu.nodeId)
    : undefined;

  // ── Smart guides (snap lines + magnetic ghost) ──────────────
  const [guides, setGuides] = useState<Array<{ type: "h" | "v"; pos: number }>>(
    [],
  );
  const [snapPreview, setSnapPreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const SNAP_THRESH = 8; // canvas-space pixels

  const computeGuides = (node: BuilderNode, rawX: number, rawY: number) => {
    const result: Array<{ type: "h" | "v"; pos: number }> = [];
    let sx = rawX,
      sy = rawY;
    const ncx = rawX + node.width / 2,
      ncy = rawY + node.height / 2;
    const cw = canvas.width,
      ch = canvas.height;
    const cx = cw / 2,
      cy = ch / 2;

    // Canvas center X
    if (Math.abs(ncx - cx) < SNAP_THRESH) {
      sx = cx - node.width / 2;
      result.push({ type: "v", pos: cx });
    }
    // Canvas center Y
    if (Math.abs(ncy - cy) < SNAP_THRESH) {
      sy = cy - node.height / 2;
      result.push({ type: "h", pos: cy });
    }
    // Canvas left/right/top/bottom edges
    if (Math.abs(rawX) < SNAP_THRESH) {
      sx = 0;
      result.push({ type: "v", pos: 0 });
    }
    if (Math.abs(rawX + node.width - cw) < SNAP_THRESH) {
      sx = cw - node.width;
      result.push({ type: "v", pos: cw });
    }
    if (Math.abs(rawY) < SNAP_THRESH) {
      sy = 0;
      result.push({ type: "h", pos: 0 });
    }
    if (Math.abs(rawY + node.height - ch) < SNAP_THRESH) {
      sy = ch - node.height;
      result.push({ type: "h", pos: ch });
    }

    // Align with other nodes
    visibleNodes
      .filter((n) => n.id !== node.id && n.visible)
      .forEach((other) => {
        const ocx = other.x + other.width / 2,
          ocy = other.y + other.height / 2;
        // Center-to-center X
        if (Math.abs(ncx - ocx) < SNAP_THRESH) {
          sx = ocx - node.width / 2;
          result.push({ type: "v", pos: ocx });
        }
        // Center-to-center Y
        if (Math.abs(ncy - ocy) < SNAP_THRESH) {
          sy = ocy - node.height / 2;
          result.push({ type: "h", pos: ocy });
        }
        // Left edges
        if (Math.abs(rawX - other.x) < SNAP_THRESH) {
          sx = other.x;
          result.push({ type: "v", pos: other.x });
        }
        // Right edges
        if (
          Math.abs(rawX + node.width - (other.x + other.width)) < SNAP_THRESH
        ) {
          sx = other.x + other.width - node.width;
          result.push({ type: "v", pos: other.x + other.width });
        }
        // Top edges
        if (Math.abs(rawY - other.y) < SNAP_THRESH) {
          sy = other.y;
          result.push({ type: "h", pos: other.y });
        }
        // Bottom edges
        if (
          Math.abs(rawY + node.height - (other.y + other.height)) < SNAP_THRESH
        ) {
          sy = other.y + other.height - node.height;
          result.push({ type: "h", pos: other.y + other.height });
        }
      });

    const snappedX = snap(sx),
      snappedY = snap(sy);
    const isSnapping = result.length > 0;
    return {
      sx: snappedX,
      sy: snappedY,
      guides: result,
      isSnapping,
      w: node.width,
      h: node.height,
    };
  };

  const clearSnap = () => {
    setGuides([]);
    setSnapPreview(null);
  };
  // ── end Smart guides ──────────────────────────────────────────

  useEffect(() => {
    if (!savedLayout || hydratedLayoutId.current === savedLayout.id) return;
    setSchema(savedLayout.schema);
    hydratedLayoutId.current = savedLayout.id;
  }, [savedLayout, setSchema]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName ?? "",
        ) || (e.target as HTMLElement)?.isContentEditable;
      if (isTyping) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        // Block delete if the single selected node is locked, but allow multi-delete
        if (selectedIds.length <= 1 && selectedNode?.locked) return;
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, deleteNode, selectedNode, selectedIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = visibleNodes.findIndex((n) => n.id === event.active.id);
    const newIndex = visibleNodes.findIndex((n) => n.id === event.over?.id);
    reorderNodes(arrayMove(visibleNodes, oldIndex, newIndex).map((n) => n.id));
  };

  const startTextEdit = (node: BuilderNode) => {
    if (!isEditableTextNode(node) || node.locked) return;
    selectNode(node.id);
    setEditingId(node.id);
    setEditValue(
      readString(node.props.content, readString(node.props.label, "")),
    );
  };
  const commitTextEdit = () => {
    const node = nodes.find((n) => n.id === editingId);
    if (!node) return;
    updateNodeProps(
      node.id,
      node.type === "button" ? { label: editValue } : { content: editValue },
    );
    setEditingId(null);
  };
  const cancelTextEdit = () => {
    setEditingId(null);
    setEditValue("");
  };
  const bringNodeToFront = (node: BuilderNode) => {
    const max = Math.max(
      ...nodes.filter((n) => n.page === node.page).map((n) => n.zIndex),
    );
    updateNode(node.id, { zIndex: max + 1 });
  };
  const sendNodeToBack = (node: BuilderNode) => {
    const min = Math.min(
      ...nodes.filter((n) => n.page === node.page).map((n) => n.zIndex),
    );
    updateNode(node.id, { zIndex: min - 1 });
  };
  const runContextAction = (action: () => void) => {
    action();
    setContextMenu(null);
  };

  const toolbarBtn =
    "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors";

  return (
    <div
      className="-mx-4 -my-6 flex flex-col overflow-hidden lg:-mx-8"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* ── Top toolbar ──────────────────────────────── */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-zinc-200 bg-white px-3">
        {/* Screen tabs */}
        <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5">
          {pageLabels.map((page) => {
            const isEnabled =
              !canvas.enabledPages || canvas.enabledPages.includes(page);
            return (
              <div key={page} className="group relative">
                <button
                  onClick={() => setActivePage(page)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[11px] font-medium capitalize transition-colors",
                    activePage === page
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700",
                    !isEnabled && "opacity-40",
                  )}
                >
                  {page}
                  {!isEnabled && (
                    <span className="ml-1 text-[9px] text-zinc-400">(off)</span>
                  )}
                </button>
                {/* Right-click or long-hover toggle */}
                <button
                  title={
                    isEnabled
                      ? "Disable page on tablet"
                      : "Enable page on tablet"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    const all = pageLabels;
                    const current = canvas.enabledPages ?? all;
                    const next = isEnabled
                      ? current.filter((p) => p !== page)
                      : [...current, page];
                    updateCanvas({
                      enabledPages:
                        next.length === all.length ? undefined : next,
                    });
                  }}
                  className="absolute -right-1 -top-1 hidden size-3.5 items-center justify-center rounded-full border border-zinc-300 bg-white text-[8px] text-zinc-500 shadow-sm hover:border-zinc-500 hover:text-zinc-900 group-hover:flex"
                >
                  {isEnabled ? "●" : "○"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mx-2 h-4 w-px bg-zinc-200" />

        {/* Zoom */}
        <button
          className={toolbarBtn}
          onClick={() => setZoom((z) => clampZoom(z - 0.1))}
          title="Zoom out"
        >
          <ZoomOut className="size-3.5" />
        </button>
        <button
          className="w-14 rounded-md px-1 py-1 text-center text-xs font-mono text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          onClick={fitToScreen}
          title="Fit to screen (Shift+1)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className={toolbarBtn}
          onClick={() => setZoom((z) => clampZoom(z + 0.1))}
          title="Zoom in"
        >
          <ZoomIn className="size-3.5" />
        </button>
        <button
          className={toolbarBtn}
          onClick={fitToScreen}
          title="Fit to screen (Shift+1)"
        >
          <Maximize2 className="size-3.5" />
        </button>
        {selectedId && (
          <button
            className={toolbarBtn}
            onClick={() => panToNode(selectedId)}
            title="Pan to selection (F)"
          >
            <Crosshair className="size-3.5" />
          </button>
        )}

        <div className="mx-2 h-4 w-px bg-zinc-200" />

        {/* Undo / Redo */}
        <button className={toolbarBtn} onClick={undo}>
          <Undo2 className="size-3.5" />
        </button>
        <button className={toolbarBtn} onClick={redo}>
          <Redo2 className="size-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Auto-save indicator */}
          {lastAutoSave && (
            <span
              className="flex items-center gap-1 text-[10px] text-zinc-400"
              title={`Auto-saved at ${new Date(lastAutoSave).toLocaleTimeString()}`}
            >
              <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
              {relativeTime(lastAutoSave)}
            </span>
          )}
          {/* Current theme name */}
          {currentThemeName && (
            <span
              className="max-w-[120px] truncate rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600"
              title={currentThemeName}
            >
              {currentThemeName}
            </span>
          )}
          <span className="text-xs text-zinc-400">
            <Smartphone className="inline size-3.5" /> {canvas.width}×
            {canvas.height}
          </span>
          {/* Load button */}
          <button
            className={toolbarBtn}
            onClick={() => {
              setLocalDrafts(getDrafts());
              setShowLoadDialog(true);
            }}
            title="Load template"
          >
            <FolderOpen className="size-3.5" />
            Load
          </button>
          {/* New theme — always opens name dialog */}
          <button
            onClick={() => {
              setThemeName("");
              setShowSaveDialog(true);
            }}
            className={toolbarBtn}
            title="Create new theme"
          >
            <Plus className="size-3.5" />
            New theme
          </button>
          {/* Save — updates existing or opens dialog if no theme loaded */}
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
            title={
              currentThemeId
                ? `Save changes to “${currentThemeName}” (Ctrl+S)`
                : "Save as new theme"
            }
          >
            <Save className="size-3.5" />
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar — Layers ──────────────────── */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Layers
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              {visibleNodes.length}
            </Badge>
          </div>

          {/* Payment page context hint */}
          {activePage === "payment" && (
            <div className="mx-2 mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-800">
              <div className="font-semibold">💳 Centered Dialog</div>
              <div className="mt-0.5 text-amber-700">
                Payment renders as a centered Flutter dialog (maxWidth 520px).
                Place nodes over the white card area.
              </div>
            </div>
          )}

          {/* Template page empty-state hint */}
          {activePage === "template" && visibleNodes.length === 0 && (
            <div className="mx-2 mb-2 rounded-md border border-orange-200 bg-orange-50 px-2 py-1.5 text-[10px] leading-snug text-orange-800">
              <div className="font-semibold">📋 No nodes on this page</div>
              <div className="mt-0.5 text-orange-700">
                This page was added after your saved theme. Add components from
                the panel below.
              </div>
            </div>
          )}

          {/* Generic empty-state hint */}
          {activePage !== "template" &&
            activePage !== "payment" &&
            visibleNodes.length === 0 && (
              <div className="mx-2 mb-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-500">
                No layers yet — add a component below.
              </div>
            )}
          <ScrollArea className="flex-1">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={visibleNodes.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5 px-2 pb-2">
                  {visibleNodes.map((node) => (
                    <SortableLayer key={node.id} node={node} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
          <div className="border-t border-zinc-200 p-2">
            <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Add —{" "}
              <span className="text-zinc-600 normal-case">{activePage}</span>
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {PAGE_COMPONENTS[activePage].map((type) => {
                const meta = COMPONENT_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-[11px] text-zinc-400">
                      {meta.icon}
                    </span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Canvas area ───────────────────────────── */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden"
          style={{
            background: "#F0F0F2",
            cursor: isPanningRef.current
              ? "grabbing"
              : spaceRef.current
                ? "grab"
                : "default",
          }}
          onClick={() => selectNode(null)}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={(e) => {
            e.preventDefault();
            selectNode(null);
            setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null });
          }}
        >
          {/* Viewport ref — measure available space for fitToScreen */}
          <div
            ref={viewportRef}
            className="pointer-events-none absolute inset-0"
          />
          {/* Dot grid */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgba(0,0,0,0.10) 1px,transparent 1px)",
              backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
              backgroundPosition: `${pan.x % (22 * zoom)}px ${pan.y % (22 * zoom)}px`,
            }}
          />

          {/* Box-select rubber band overlay */}
          {boxSelect &&
            (() => {
              const canvasOrigin = canvasToClient(0, 0);
              const x1 = Math.min(boxSelect.startX, boxSelect.endX);
              const y1 = Math.min(boxSelect.startY, boxSelect.endY);
              const x2 = Math.max(boxSelect.startX, boxSelect.endX);
              const y2 = Math.max(boxSelect.startY, boxSelect.endY);
              return (
                <div
                  className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/10"
                  style={{
                    left: canvasOrigin.x + x1 * zoom,
                    top: canvasOrigin.y + y1 * zoom,
                    width: (x2 - x1) * zoom,
                    height: (y2 - y1) * zoom,
                  }}
                />
              );
            })()}

          {/* Transform wrapper — centered + panned */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="pointer-events-auto relative"
              style={{
                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              {/* Page label */}
              <div className="absolute -top-7 left-0 select-none whitespace-nowrap text-[11px] font-medium text-zinc-400 capitalize">
                {activePage} — {canvas.width} × {canvas.height}
              </div>

              {/* Device frame */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
                style={{
                  width: canvas.width,
                  height: canvas.height,
                  backgroundColor: canvas.backgroundColor ?? "#ffffff",
                  // For payment page: show landing background dimmed behind the dialog
                  backgroundImage: (
                    activePage === "payment"
                      ? canvas.pageBackgrounds?.["landing"]?.image
                      : canvas.pageBackgrounds?.[activePage]?.image
                  )
                    ? `url(${
                        activePage === "payment"
                          ? canvas.pageBackgrounds!["landing"]!.image
                          : canvas.pageBackgrounds![activePage]!.image
                      })`
                    : undefined,
                  backgroundSize: "cover",
                  borderRadius: 28,
                  outline: "10px solid #1a1a1a",
                  outlineOffset: "0px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Notch */}
                <div className="absolute left-1/2 top-3 z-50 h-1 w-20 -translate-x-1/2 rounded-full bg-black/20" />

                {/* Smart guide lines — rendered in canvas coordinate space */}
                {guides.map((g, i) =>
                  g.type === "v" ? (
                    <div
                      key={i}
                      className="pointer-events-none absolute inset-y-0"
                      style={{
                        left: g.pos,
                        width: 1,
                        background: "#F000A0",
                        zIndex: 9999,
                        opacity: 0.85,
                      }}
                    />
                  ) : (
                    <div
                      key={i}
                      className="pointer-events-none absolute inset-x-0"
                      style={{
                        top: g.pos,
                        height: 1,
                        background: "#F000A0",
                        zIndex: 9999,
                        opacity: 0.85,
                      }}
                    />
                  ),
                )}

                {/* Magnetic snap ghost — destination rectangle */}
                {snapPreview && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: snapPreview.x,
                      top: snapPreview.y,
                      width: snapPreview.w,
                      height: snapPreview.h,
                      border: `${Math.max(2, canvas.width * 0.0012)}px dashed #F000A0`,
                      background: "rgba(240,0,160,0.08)",
                      borderRadius: 4,
                      zIndex: 9998,
                      boxShadow: "0 0 0 1px rgba(240,0,160,0.15)",
                    }}
                  >
                    {/* Coordinate label */}
                    <div
                      className="absolute -top-6 left-0 whitespace-nowrap rounded bg-[#F000A0] px-1.5 py-0.5 font-mono font-semibold text-white"
                      style={{ fontSize: Math.max(10, canvas.width * 0.01) }}
                    >
                      {snapPreview.x}, {snapPreview.y}
                    </div>
                  </div>
                )}

                {/* Per-page video background (for payment page: show landing video behind dialog) */}
                {(
                  activePage === "payment"
                    ? canvas.pageBackgrounds?.["landing"]?.video
                    : canvas.pageBackgrounds?.[activePage]?.video
                ) ? (
                  <video
                    src={
                      activePage === "payment"
                        ? canvas.pageBackgrounds!["landing"]!.video
                        : canvas.pageBackgrounds![activePage]!.video
                    }
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ zIndex: 0 }}
                  />
                ) : null}

                {/* Template page layout guide — scaled to canvas dimensions */}
                {activePage === "template" &&
                  (() => {
                    // All Flutter coords are for 1280×800; scale to current canvas
                    const sx = canvas.width / 1280;
                    const sy = canvas.height / 800;
                    const leftX = Math.round(84 * sx),
                      topY = Math.round(148 * sy);
                    const leftW = Math.round(600 * sx),
                      leftH = Math.round(540 * sy);
                    const rightX = Math.round(712 * sx),
                      rightW = Math.round(484 * sx);
                    const dividerX = Math.round(700 * sx);
                    const fontSize = Math.max(
                      9,
                      Math.round(canvas.width * 0.008),
                    );
                    return (
                      <>
                        {/* Left panel: template-preview area */}
                        <div
                          className="pointer-events-none absolute"
                          style={{
                            left: leftX,
                            top: topY,
                            width: leftW,
                            height: leftH,
                            border: "1px dashed rgba(234,88,12,0.30)",
                            borderRadius: 10,
                            zIndex: 1,
                            background: "rgba(234,88,12,0.03)",
                          }}
                        >
                          <div
                            className="absolute left-2 top-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-orange-600/60 italic"
                            style={{
                              fontSize,
                              background: "rgba(255,237,213,0.7)",
                            }}
                          >
                            📐 Guide — Preview Area
                          </div>
                        </div>
                        {/* Right panel: template grid area */}
                        <div
                          className="pointer-events-none absolute"
                          style={{
                            left: rightX,
                            top: topY,
                            width: rightW,
                            height: leftH,
                            border: "1px dashed rgba(234,88,12,0.30)",
                            borderRadius: 10,
                            zIndex: 1,
                            background: "rgba(234,88,12,0.03)",
                          }}
                        >
                          <div
                            className="absolute left-2 top-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-orange-600/60 italic"
                            style={{
                              fontSize,
                              background: "rgba(255,237,213,0.7)",
                            }}
                          >
                            📐 Guide — Template Grid
                          </div>
                        </div>
                        {/* Vertical divider */}
                        <div
                          className="pointer-events-none absolute"
                          style={{
                            left: dividerX,
                            top: topY,
                            width: 1,
                            height: leftH,
                            background: "rgba(234,88,12,0.18)",
                            zIndex: 1,
                          }}
                        />
                      </>
                    );
                  })()}

                {/* Payment modal visual — centered dialog (matches Flutter AlertDialog) */}
                {activePage === "payment" &&
                  (() => {
                    const mw = Math.round(
                      canvas.width * (canvas.paymentModal?.widthRatio ?? 0.406),
                    );
                    const mh = Math.round(
                      canvas.height *
                        (canvas.paymentModal?.heightRatio ?? 0.75),
                    );
                    const mx = Math.round((canvas.width - mw) / 2);
                    const my = Math.round((canvas.height - mh) / 2);
                    const br = canvas.paymentModal?.borderRadius ?? 20;
                    // Barrier: #1B1B1B @ 0.55 (Flutter default)
                    const barrierHex =
                      canvas.paymentModal?.barrierColor ?? "#1B1B1B";
                    const r = parseInt(barrierHex.slice(1, 3), 16);
                    const g = parseInt(barrierHex.slice(3, 5), 16);
                    const b = parseInt(barrierHex.slice(5, 7), 16);
                    const barrierBg = `rgba(${r},${g},${b},0.55)`;
                    const dialogBg =
                      canvas.paymentModal?.backgroundColor ?? "#FAF8F2";
                    return (
                      <>
                        {/* Scrim / backdrop — matches Flutter #1B1B1B @ 0.55 */}
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{ background: barrierBg, zIndex: 1 }}
                        />
                        {/* Centered dialog card — background comes from payment page's uploaded bg */}
                        <div
                          className="pointer-events-none absolute overflow-hidden"
                          style={{
                            left: mx,
                            top: my,
                            width: mw,
                            height: mh,
                            borderRadius: br,
                            zIndex: 2,
                            boxShadow: "0 8px 48px rgba(0,0,0,0.30)",
                            backgroundColor: canvas.pageBackgrounds?.["payment"]
                              ?.image
                              ? "transparent"
                              : dialogBg,
                            backgroundImage: canvas.pageBackgrounds?.["payment"]
                              ?.image
                              ? `url(${canvas.pageBackgrounds["payment"]!.image})`
                              : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        >
                          {/* Payment page video on dialog card */}
                          {canvas.pageBackgrounds?.["payment"]?.video ? (
                            <video
                              src={canvas.pageBackgrounds["payment"]!.video}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="absolute inset-0 h-full w-full object-cover"
                              style={{ zIndex: 0 }}
                            />
                          ) : null}
                          {/* Badge label */}
                          <div
                            className="absolute right-0 top-0 flex items-center gap-1 bg-amber-400 px-2 py-1 text-amber-900"
                            style={{
                              fontSize: Math.max(10, canvas.width * 0.012),
                              fontWeight: 600,
                              borderTopRightRadius: br,
                              borderBottomLeftRadius: br / 2,
                            }}
                          >
                            Payment Dialog ({mw}×{mh})
                          </div>
                          {/* Coordinate reference */}
                          <div
                            className="absolute bottom-2 left-3 font-mono text-zinc-300"
                            style={{
                              fontSize: Math.max(9, canvas.width * 0.009),
                            }}
                          >
                            x:{mx} y:{my} — place nodes relative to full screen
                          </div>
                        </div>
                      </>
                    );
                  })()}

                {visibleNodes.map((node) =>
                  node.visible ? (
                    <Rnd
                      key={node.id}
                      scale={zoom}
                      bounds="parent"
                      disableDragging={node.locked || editingId === node.id}
                      enableResizing={!node.locked && editingId !== node.id}
                      position={{ x: node.x, y: node.y }}
                      size={{ width: node.width, height: node.height }}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        selectNode(node.id, e.shiftKey);
                      }}
                      onContextMenu={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectNode(node.id);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          nodeId: node.id,
                        });
                      }}
                      onDrag={(_, d) => {
                        const {
                          guides: g,
                          sx,
                          sy,
                          isSnapping,
                          w,
                          h,
                        } = computeGuides(node, d.x, d.y);
                        setGuides(g);
                        setSnapPreview(
                          isSnapping ? { x: sx, y: sy, w, h } : null,
                        );
                      }}
                      onDragStop={(_, d) => {
                        const { sx, sy } = computeGuides(node, d.x, d.y);
                        updateNode(node.id, { x: sx, y: sy });
                        clearSnap();
                      }}
                      onResizeStop={(_, __, ref, ___, pos) => {
                        const w = snap(ref.offsetWidth);
                        const h = node.lockAspect
                          ? Math.round(w * (node.height / node.width))
                          : snap(ref.offsetHeight);
                        updateNode(node.id, {
                          width: w,
                          height: h,
                          x: snap(pos.x),
                          y: snap(pos.y),
                        });
                        clearSnap();
                      }}
                      style={{
                        zIndex: node.zIndex,
                        opacity: node.opacity,
                        transform: `rotate(${node.rotation}deg)`,
                      }}
                      className={cn(
                        "group",
                        selectedId === node.id &&
                          "outline outline-2 outline-offset-1 outline-zinc-950",
                        node.locked && "cursor-not-allowed",
                      )}
                    >
                      <NodeRenderer
                        node={node}
                        editing={editingId === node.id}
                        editValue={editValue}
                        onEditChange={setEditValue}
                        onEditCommit={commitTextEdit}
                        onEditCancel={cancelTextEdit}
                        onStartEdit={() => startTextEdit(node)}
                      />
                    </Rnd>
                  ) : null,
                )}
              </motion.div>
            </div>
          </div>

          {/* Zoom hint */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[10px] text-zinc-400 shadow-sm backdrop-blur-sm">
            Ctrl+scroll to zoom · Space+drag to pan · Shift+1 Fit · Shift+2 100%
            · F Pan to selection
          </div>
        </div>

        {/* ── Right sidebar — Properties ─────────────── */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Properties
            </span>
            <AlignCenter className="size-3.5 text-zinc-300" />
          </div>
          <ScrollArea className="flex-1 px-3 pb-4">
            <CanvasControls />
            <PropertiesPanel
              selectedNode={selectedNode}
              onStartEdit={startTextEdit}
            />
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Schema
                </span>
                <RotateCw className="size-3 text-zinc-300" />
              </div>
              <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 p-2.5 text-[9px] leading-4 text-zinc-300">
                {JSON.stringify(schema(), null, 2)}
              </pre>
            </div>
          </ScrollArea>
        </aside>
      </div>

      {contextMenu ? (
        <BuilderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextNode}
          onClose={() => setContextMenu(null)}
          onEditText={() =>
            contextNode && runContextAction(() => startTextEdit(contextNode))
          }
          onDuplicate={() =>
            contextNode && runContextAction(() => duplicateNode(contextNode.id))
          }
          onDelete={() =>
            contextNode && runContextAction(() => deleteNode(contextNode.id))
          }
          onToggleLock={() =>
            contextNode &&
            runContextAction(() => toggleNode(contextNode.id, "locked"))
          }
          onToggleVisible={() =>
            contextNode &&
            runContextAction(() => toggleNode(contextNode.id, "visible"))
          }
          onBringToFront={() =>
            contextNode && runContextAction(() => bringNodeToFront(contextNode))
          }
          onSendToBack={() =>
            contextNode && runContextAction(() => sendNodeToBack(contextNode))
          }
          onAddNode={(type) => runContextAction(() => addNode(type))}
        />
      ) : null}

      {/* ── Load Template Dialog ──────────────────────────────── */}
      {showLoadDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 pt-16 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoadDialog(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="text-base font-semibold text-zinc-900">
                Load Template
              </h2>
              <button
                onClick={() => setShowLoadDialog(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100">
              <button
                onClick={() => setLoadTab("local")}
                className={cn(
                  "flex-1 py-2.5 text-xs font-semibold transition-colors",
                  loadTab === "local"
                    ? "border-b-2 border-zinc-900 text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-700",
                )}
              >
                📁 Local Drafts{" "}
                {localDrafts.length > 0 && `(${localDrafts.length})`}
              </button>
              <button
                onClick={() => setLoadTab("db")}
                className={cn(
                  "flex-1 py-2.5 text-xs font-semibold transition-colors",
                  loadTab === "db"
                    ? "border-b-2 border-zinc-900 text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-700",
                )}
              >
                ☁️ Saved Themes {dbThemes.length > 0 && `(${dbThemes.length})`}
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-zinc-100 px-4 py-2">
              <input
                className="w-full rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-zinc-200 placeholder:text-zinc-400"
                placeholder="Search templates…"
                value={loadSearch}
                onChange={(e) => setLoadSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loadTab === "local" && (
                <>
                  {localDrafts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm font-medium text-zinc-400">
                        No local drafts yet
                      </p>
                      <p className="mt-1 text-xs text-zinc-300">
                        Press Ctrl+S or click Save to create a draft.
                      </p>
                    </div>
                  )}
                  {localDrafts
                    .filter(
                      (d) =>
                        !loadSearch ||
                        d.name.toLowerCase().includes(loadSearch.toLowerCase()),
                    )
                    .map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center gap-3 border-b border-zinc-50 px-4 py-3 hover:bg-zinc-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-800">
                            {draft.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-400">
                            {relativeTime(draft.savedAt)} ·{" "}
                            {draft.schema.canvas?.width ?? "?"}×
                            {draft.schema.canvas?.height ?? "?"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleLoadSchema(draft.schema)}
                          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteLocalDraft(draft.id)}
                          className="shrink-0 rounded-md p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500"
                          title="Delete draft"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                </>
              )}

              {loadTab === "db" && (
                <>
                  {dbThemes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm font-medium text-zinc-400">
                        No themes in database
                      </p>
                      <p className="mt-1 text-xs text-zinc-300">
                        Click &quot;Save theme&quot; to publish a theme to the
                        database.
                      </p>
                    </div>
                  )}
                  {dbThemes
                    .filter(
                      (t) =>
                        !loadSearch ||
                        t.name.toLowerCase().includes(loadSearch.toLowerCase()),
                    )
                    .map((theme) => (
                      <div
                        key={theme.id}
                        className="flex items-center gap-3 border-b border-zinc-50 px-4 py-3 hover:bg-zinc-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium text-zinc-800">
                              {theme.name}
                            </p>
                            {theme.is_active && (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] text-zinc-400">
                            {relativeTime(theme.updated_at)} ·{" "}
                            {theme.schema.canvas?.width ?? "?"}×
                            {theme.schema.canvas?.height ?? "?"}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleLoadSchema(theme.schema, {
                              themeId: theme.id,
                              themeName: theme.name,
                            })
                          }
                          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 px-5 py-3 text-[10px] text-zinc-400">
              Local drafts are stored in your browser · DB themes are from
              Supabase
            </div>
          </div>
        </div>
      )}

      {/* ── Save Theme Dialog ───────────────────────────────── */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSaveDialog(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-semibold text-zinc-900">
              Save as Theme
            </h2>
            <p className="mb-4 text-sm text-zinc-500">
              Give this layout a name. It will appear on the Themes page where
              you can activate it for the kiosk.
            </p>
            <input
              autoFocus
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              placeholder="e.g. Redmi Pad Landscape v1"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && themeName.trim())
                  void handleSaveConfirm();
                if (e.key === "Escape") setShowSaveDialog(false);
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveConfirm()}
                disabled={!themeName.trim() || isSaving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function handleSaveConfirm() {
    if (!themeName.trim()) return;
    const name = themeName.trim();
    setIsSaving(true);
    try {
      // Auto-save to localStorage
      autoSaveSchema(schema());
      setLastAutoSave(new Date().toISOString());

      // Push to database (always creates new — "New theme" flow)
      const newId = await saveLayoutMutation.mutateAsync({
        name,
        schema: schema(),
      });
      // Track as current theme so future Saves update in-place
      setCurrentThemeId(newId);
      setCurrentThemeName(name);
      setShowSaveDialog(false);
      setThemeName("");
      toast.success(
        `Theme "${name}" created! Future saves will update it in-place.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save theme");
    } finally {
      setIsSaving(false);
    }
  }
}
