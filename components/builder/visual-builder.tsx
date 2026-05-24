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
  Eye,
  EyeOff,
  Film,
  Grid2X2,
  Image as ImageIcon,
  Lock,
  Monitor,
  Move,
  PaintBucket,
  Plus,
  Redo2,
  RotateCw,
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
import { useActiveLayoutSchema } from "@/hooks/use-admin-data";
import { adminService } from "@/lib/services/admin-service";
import { uploadBuilderImage, uploadBuilderMedia } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderComponentType, BuilderNode, BuilderPage } from "@/types/builder";

/** Semantic roles Flutter uses to bind the correct action handler to each button */
const SEMANTIC_ROLES: { value: string; label: string; screen: string }[] = [
  // Landing
  { value: "landing.start_session", label: "Start Session", screen: "landing" },
  // Payment
  { value: "payment.confirm", label: "Sudah Bayar (Confirm)", screen: "payment" },
  { value: "payment.cancel", label: "Batal (Cancel)", screen: "payment" },
  // Camera
  { value: "camera.take_photo", label: "Take Photo", screen: "camera" },
  { value: "camera.continue", label: "Continue after photos", screen: "camera" },
  { value: "camera.retake", label: "Retake", screen: "camera" },
  // Preview
  { value: "preview.print", label: "Print", screen: "preview" },
  { value: "preview.finish", label: "Finish / Done", screen: "preview" },
  { value: "preview.share", label: "Share / Download", screen: "preview" },
  // Thanks
  { value: "thanks.return_home", label: "Return to Landing", screen: "thanks" },
  // Generic
  { value: "generic.action", label: "Generic (no binding)", screen: "generic" },
];

const pageLabels: BuilderPage[] = ["landing", "payment", "camera", "preview", "thanks"];
const componentTypes: BuilderComponentType[] = [
  "text",
  "image",
  "button",
  "stamp",
  "qr",
  "qr-placeholder",
  "camera-view",
  "receipt-preview",
  "frame-preview",
  "social-handle",
  "background-decoration",
];

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
  return node.type === "image" || node.type === "frame-preview" || node.type === "stamp" || node.type === "background-decoration";
}

function isCameraView(node: BuilderNode) {
  return node.type === "camera-view";
}

function isQrPlaceholder(node: BuilderNode) {
  return node.type === "qr-placeholder";
}

function isEditableTextNode(node: BuilderNode) {
  return node.type === "text" || node.type === "button" || node.type === "social-handle";
}

/** Color per component type for hotspot overlay mode */
const HOTSPOT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  button:               { bg: "rgba(59,130,246,0.22)",  border: "#3b82f6",  text: "#1d4ed8" },
  "camera-view":        { bg: "rgba(15,15,25,0.45)",   border: "#a1a1aa",  text: "#ffffff" },
  text:                 { bg: "rgba(139,92,246,0.15)",  border: "#8b5cf6",  text: "#6d28d9" },
  "social-handle":      { bg: "rgba(139,92,246,0.12)",  border: "#a78bfa",  text: "#7c3aed" },
  "qr-placeholder":     { bg: "rgba(245,158,11,0.22)",  border: "#f59e0b",  text: "#b45309" },
  "receipt-preview":    { bg: "rgba(168,85,247,0.20)",  border: "#a855f7",  text: "#7e22ce" },
  qr:                   { bg: "rgba(245,158,11,0.18)",  border: "#fbbf24",  text: "#92400e" },
  image:                { bg: "rgba(16,185,129,0.18)",  border: "#10b981",  text: "#065f46" },
  stamp:                { bg: "rgba(16,185,129,0.14)",  border: "#34d399",  text: "#065f46" },
  "frame-preview":      { bg: "rgba(16,185,129,0.14)",  border: "#34d399",  text: "#065f46" },
  "background-decoration": { bg: "rgba(100,116,139,0.15)", border: "#94a3b8", text: "#475569" },
};

/** Hotspot overlay — shown when canvas has a background image/video */
function HotspotOverlay({ node }: { node: BuilderNode }) {
  const canvas = useBuilderStore((state) => state.canvas);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const colors = HOTSPOT_COLORS[node.type] ?? { bg: "rgba(100,100,100,0.2)", border: "#71717a", text: "#3f3f46" };
  const role = typeof node.props.semanticRole === "string" ? node.props.semanticRole : "";

  // Scale labels proportionally to canvas width (min values for small canvases)
  const labelSize = Math.max(12, Math.round(canvas.width * 0.028));
  const roleSize  = Math.max(10, Math.round(canvas.width * 0.022));
  const padH = Math.max(6, Math.round(canvas.width * 0.008));
  const padV = Math.max(3, Math.round(canvas.width * 0.004));
  const borderW = Math.max(2, Math.round(canvas.width * 0.003));

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden text-center"
      style={{ background: colors.bg, borderColor: colors.border, borderWidth: borderW, borderStyle: "dashed", borderRadius: 4 }}
    >
      <span
        className="max-w-full truncate rounded font-bold uppercase tracking-wide"
        style={{ color: colors.text, background: colors.border + "22", fontSize: labelSize, paddingLeft: padH, paddingRight: padH, paddingTop: padV, paddingBottom: padV }}
      >
        {node.type}
      </span>

      {role ? (
        <span className="max-w-full truncate font-mono" style={{ color: colors.text, opacity: 0.85, fontSize: roleSize }}>
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
    const role = readString(node.props.semanticRole as string | undefined ?? "", "");
    const roleLabel = SEMANTIC_ROLES.find((r) => r.value === role)?.label;

    if (editing) {
      return (
        <input
          autoFocus
          className="h-full w-full border-none bg-transparent px-3 text-center text-sm font-medium outline-none"
          style={{
            background: readString(node.props.background, "#18181b"),
            color: readString(node.props.color, "#ffffff"),
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

    return (
      <div
        className="relative grid h-full w-full place-items-center font-medium shadow-sm"
        style={{
          background: readString(node.props.background, "#18181b"),
          color: readString(node.props.color, "#ffffff"),
          borderRadius: readNumber(node.props.radius, Math.max(6, Math.round(canvas.width * 0.005))),
          fontSize: readNumber(node.props.fontSize, scaledDefaultFontSize),
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onStartEdit?.();
        }}
      >
        {readString(node.props.label, "Button")}
        {/* Semantic role badge — visible in builder, not in Flutter UI */}
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
            <span key={index} className={cn("rounded-sm", index % 3 === 0 ? "bg-zinc-950" : "bg-zinc-200")} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "camera-view") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-zinc-950">
        {/* Camera grid overlay */}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "33.33% 33.33%" }} />
        {/* Center camera icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="size-14 text-white/20" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">Live Camera Feed</span>
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
          <span className="text-[9px] font-bold uppercase tracking-wide text-white">Live</span>
        </div>
        {/* Center crosshair */}
        <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-1/2 h-full w-px -translate-x-1/2 bg-white/30" />
          <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-white/30" />
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
              <div key={i} className={cn("aspect-square rounded-[1px]", (i * 7 + i) % 5 === 0 ? "bg-zinc-800" : "bg-zinc-200")} />
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
        <div className="text-center text-sm font-bold">{readString(node.props.title, "POSKART")}</div>
        <div className="my-4 h-28 rounded bg-zinc-100" />
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span>DOUBLE PRINT</span><span>10K</span></div>
          <div className="flex justify-between"><span>QR DOWNLOAD</span><span>ON</span></div>
          <div className="border-t border-dashed pt-2 text-center">{readString(node.props.code, "PK-0000")}</div>
        </div>
      </div>
    );
  }

  if (isMediaNode(node)) {
    const src = readString(node.props.src, "");
    const alt = readString(node.props.alt, node.type);
    const radius = readNumber(node.props.radius, node.type === "background-decoration" ? 0 : 8);
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
          fontFamily: readString(node.props.fontFamily as string | undefined, "inherit"),
          textAlign: (node.props.textAlign as React.CSSProperties["textAlign"]) ?? "left",
          letterSpacing: node.props.letterSpacing != null ? `${node.props.letterSpacing}px` : undefined,
          lineHeight: node.props.lineHeight != null ? String(node.props.lineHeight) : "1.4",
        }}
        value={editValue ?? ""}
        onChange={(event) => onEditChange?.(event.target.value)}
        onBlur={onEditCommit}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onEditCancel?.();
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onEditCommit?.();
        }}
      />
    );
  }

  return (
    <div
      className="flex h-full w-full items-center overflow-hidden"
      style={{
        color,
        fontSize,
        fontWeight: readNumber(node.props.fontWeight, 500),
        fontFamily: readString(node.props.fontFamily as string | undefined, "inherit"),
        textAlign: (node.props.textAlign as React.CSSProperties["textAlign"]) ?? "left",
        letterSpacing: node.props.letterSpacing != null ? `${node.props.letterSpacing}px` : undefined,
        lineHeight: node.props.lineHeight != null ? String(node.props.lineHeight) : "1.4",
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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
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
      <button className={cn("cursor-grab", isSelected ? "text-zinc-400" : "text-zinc-400")} {...attributes} {...listeners}>
        <Grid2X2 className="size-3" />
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={() => selectNode(node.id)}>
        <div className="flex items-center gap-1.5">
          <span className={cn("shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide", isSelected ? "bg-white/15 text-white" : badgeClass)}>
            {node.type}
          </span>
          <span className={cn("truncate text-[10px]", isSelected ? "text-zinc-300" : "text-zinc-400")}>
            {node.id}
          </span>
        </div>
      </button>
      <button onClick={() => toggleNode(node.id, "visible")} className={isSelected ? "text-zinc-400 hover:text-white" : "text-zinc-400 hover:text-zinc-700"}>
        {node.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
      </button>
      <button onClick={() => toggleNode(node.id, "locked")} className={isSelected ? "text-zinc-400 hover:text-white" : "text-zinc-400 hover:text-zinc-700"}>
        {node.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
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
        <Input className="h-9 p-1" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
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
        <span className={cn("text-zinc-400 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}>
          ▾
        </span>
      </button>
      {open && <div className="space-y-3 border-t border-zinc-100 p-3">{children}</div>}
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
      toast.error(error instanceof Error ? error.message : "Unable to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (!selectedNode) {
    return <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">Select a layer to edit position, typography, colors, radius, shadow, opacity, and rotation.</div>;
  }

  const editableText = isEditableTextNode(selectedNode);
  const mediaNode = isMediaNode(selectedNode);

  return (
    <div className="space-y-2">
      {/* Node header */}
      <div className="flex items-center justify-between py-1">
        <div>
          <div className="text-sm font-semibold capitalize">{selectedNode.type}</div>
          <div className="text-[10px] font-mono text-zinc-400">{selectedNode.id}</div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => duplicateNode(selectedNode.id)}><Copy /></Button>
          <Button variant="ghost" size="icon" onClick={() => deleteNode(selectedNode.id)}><Trash2 /></Button>
        </div>
      </div>

      {/* Transform */}
      <PanelSection title="Transform" icon={<Move className="size-3.5 text-zinc-500" />}>
        <div className="grid grid-cols-2 gap-2">
          {(["x", "y", "width", "height"] as const).map((key) => (
            <label key={key} className="text-xs font-medium text-zinc-500">
              {key.toUpperCase()}
              <Input className="mt-1" type="number" value={selectedNode[key]}
                onChange={(e) => updateNode(selectedNode.id, { [key]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
        <label className="block text-xs font-medium text-zinc-500">
          Opacity
          <Slider min={0.1} max={1} step={0.05} value={selectedNode.opacity}
            onChange={(e) => updateNode(selectedNode.id, { opacity: Number(e.target.value) })} />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Rotation
          <Input className="mt-1" type="number" value={selectedNode.rotation}
            onChange={(e) => updateNode(selectedNode.id, { rotation: Number(e.target.value) })} />
        </label>
        {editableText && (
          <Button variant="outline" className="w-full" onClick={() => onStartEdit(selectedNode)}>
            <Type className="size-4" /> Edit text on canvas
          </Button>
        )}
      </PanelSection>

      {/* Text */}
      {editableText && (
        <PanelSection title="Text" icon={<Type className="size-3.5 text-zinc-500" />}>
          <label className="block text-xs font-medium text-zinc-500">
            Content
            <Input className="mt-1"
              value={readString(selectedNode.props.content, readString(selectedNode.props.label, ""))}
              onChange={(e) => updateNodeProps(selectedNode.id,
                selectedNode.type === "button" ? { label: e.target.value } : { content: e.target.value })} />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Font family
            <Select className="mt-1" value={readString(selectedNode.props.fontFamily as string | undefined, "")}
              onChange={(e) => updateNodeProps(selectedNode.id, { fontFamily: e.target.value || "inherit" })}>
              <option value="">System default</option>
              <option value="Inter, sans-serif">Inter</option>
              <option value="Outfit, sans-serif">Outfit</option>
              <option value="DM Sans, sans-serif">DM Sans</option>
              <option value="Nunito, sans-serif">Nunito</option>
              <option value="Playfair Display, serif">Playfair Display</option>
              <option value="Lora, serif">Lora</option>
              <option value="'Courier New', monospace">Courier New</option>
            </Select>
          </label>
          <div className="text-xs font-medium text-zinc-500">
            Alignment
            <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 p-0.5">
              {([
                { align: "left", icon: <AlignLeft className="size-3.5" /> },
                { align: "center", icon: <AlignCenter className="size-3.5" /> },
                { align: "right", icon: <AlignRight className="size-3.5" /> },
                { align: "justify", icon: <AlignJustify className="size-3.5" /> },
              ] as const).map(({ align, icon }) => {
                const current = readString(selectedNode.props.textAlign as string | undefined, "left");
                return (
                  <button key={align} type="button"
                    onClick={() => updateNodeProps(selectedNode.id, { textAlign: align })}
                    className={cn("flex flex-1 items-center justify-center rounded py-1 transition-colors",
                      current === align ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100")}>
                    {icon}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">Font size
              <Input className="mt-1" type="number"
                value={readNumber(selectedNode.props.fontSize, selectedNode.type === "button" ? 14 : 18)}
                onChange={(e) => updateNodeProps(selectedNode.id, { fontSize: Number(e.target.value) })} />
            </label>
            <label className="text-xs font-medium text-zinc-500">Weight
              <Input className="mt-1" type="number" step={100}
                value={readNumber(selectedNode.props.fontWeight, selectedNode.type === "button" ? 600 : 500)}
                onChange={(e) => updateNodeProps(selectedNode.id, { fontWeight: Number(e.target.value) })} />
            </label>
            <label className="text-xs font-medium text-zinc-500">Letter spacing
              <Input className="mt-1" type="number" step={0.5} placeholder="0"
                value={selectedNode.props.letterSpacing != null ? String(selectedNode.props.letterSpacing) : ""}
                onChange={(e) => updateNodeProps(selectedNode.id, { letterSpacing: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
            <label className="text-xs font-medium text-zinc-500">Line height
              <Input className="mt-1" type="number" step={0.1} placeholder="1.4"
                value={selectedNode.props.lineHeight != null ? String(selectedNode.props.lineHeight) : ""}
                onChange={(e) => updateNodeProps(selectedNode.id, { lineHeight: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
          </div>
          <ColorField
            label={selectedNode.type === "button" ? "Text color" : "Color"}
            value={readString(selectedNode.props.color, selectedNode.type === "button" ? "#ffffff" : "#18181b")}
            onChange={(v) => updateNodeProps(selectedNode.id, { color: v })} />
        </PanelSection>
      )}

      {/* Button */}
      {selectedNode.type === "button" && (
        <PanelSection title="Button" icon={<PaintBucket className="size-3.5 text-zinc-500" />}>
          <ColorField label="Button color"
            value={readString(selectedNode.props.background, "#18181b")}
            onChange={(v) => updateNodeProps(selectedNode.id, { background: v })} />
          <label className="text-xs font-medium text-zinc-500">
            Radius
            <Input className="mt-1" type="number"
              value={readNumber(selectedNode.props.radius, 6)}
              onChange={(e) => updateNodeProps(selectedNode.id, { radius: Number(e.target.value) })} />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            <div className="mb-1 flex items-center gap-1.5">
              Semantic Role
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                Flutter binding
              </span>
            </div>
            <Select className="mt-0 font-mono text-xs"
              value={readString(selectedNode.props.semanticRole as string | undefined ?? "", "")}
              onChange={(e) => updateNodeProps(selectedNode.id, { semanticRole: e.target.value || null })}>
              <option value="">— unassigned —</option>
              {["landing", "payment", "camera", "preview", "thanks", "generic"].map((screen) => (
                <optgroup key={screen} label={screen}>
                  {SEMANTIC_ROLES.filter((r) => r.screen === screen).map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <div className="mt-1.5 text-[10px] leading-4 text-zinc-400">
              Flutter maps this role to the correct action handler.
            </div>
          </label>
        </PanelSection>
      )}

      {/* Image */}
      {mediaNode && (
        <PanelSection title="Image" icon={<ImageIcon className="size-3.5 text-zinc-500" />}>
          <label className="block text-xs font-medium text-zinc-500">
            Source URL
            <Input className="mt-1" value={readString(selectedNode.props.src, "")} placeholder="https://..."
              onChange={(e) => updateNodeProps(selectedNode.id, { src: e.target.value })} />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Upload image
            <Input className="mt-1" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              disabled={uploading} onChange={(e) => handleImageUpload(e.target.files?.[0])} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">Fit
              <Select className="mt-1" value={readString(selectedNode.props.objectFit, "cover")}
                onChange={(e) => updateNodeProps(selectedNode.id, { objectFit: e.target.value })}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </Select>
            </label>
            <label className="text-xs font-medium text-zinc-500">Radius
              <Input className="mt-1" type="number"
                value={readNumber(selectedNode.props.radius, 8)}
                onChange={(e) => updateNodeProps(selectedNode.id, { radius: Number(e.target.value) })} />
            </label>
          </div>
          {uploading && <div className="text-xs text-zinc-500">Uploading image...</div>}
        </PanelSection>
      )}

      {/* Generic color/radius for non-text, non-media nodes */}
      {!editableText && !mediaNode && (
        <PanelSection title="Appearance" icon={<PaintBucket className="size-3.5 text-zinc-500" />} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">Color
              <Input className="mt-1" value={readString(selectedNode.props.color, "#18181b")}
                onChange={(e) => updateNodeProps(selectedNode.id, { color: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-zinc-500">Radius
              <Input className="mt-1" type="number"
                value={readNumber(selectedNode.props.radius, 6)}
                onChange={(e) => updateNodeProps(selectedNode.id, { radius: Number(e.target.value) })} />
            </label>
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
      toast.success(`${result.type === "video" ? "Video" : "Image"} background set for ${activePage}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearBg = () => setPageBackground(activePage, { image: undefined, video: undefined });
  const hasBg = !!(bgImage || bgVideo);

  return (
    <div className="mb-5 space-y-3 rounded-lg border border-zinc-200 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="size-4 text-zinc-500" />
        Canvas
      </div>

      {/* ── Canvas Mode toggle ─────────────────────── */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-zinc-500">Canvas mode</div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-0.5">
          <button
            onClick={() => updateCanvas({ overlayMode: false })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all",
              !canvas.overlayMode
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Type className="size-3.5" />
            Custom
          </button>
          <button
            onClick={() => updateCanvas({ overlayMode: true })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all",
              canvas.overlayMode
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Grid2X2 className="size-3.5" />
            Overlay
          </button>
        </div>
        <div className="text-[10px] leading-relaxed text-zinc-400">
          {canvas.overlayMode
            ? "Nodes shown as colored hotspot boxes — drag to define where Flutter renders each component."
            : "Nodes shown as real UI — text, buttons, images render as they appear in the app."}
        </div>
      </div>

      {/* Overlay mode notice */}
      {canvas.overlayMode && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-[10px] text-amber-700">
          <strong>Overlay mode</strong> — set semantic roles on each hotspot so Flutter knows which action
          or widget to place there (camera feed, confirm button, QR code, etc.)
        </div>
      )}

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          Width px
          <Input className="mt-1" min={240} max={3840} type="number" value={canvas.width}
            onChange={(e) => updateCanvas({ width: Number(e.target.value) })} />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Height px
          <Input className="mt-1" min={240} max={3840} type="number" value={canvas.height}
            onChange={(e) => updateCanvas({ height: Number(e.target.value) })} />
        </label>
      </div>
      <label className="block text-xs font-medium text-zinc-500">
        Orientation
        <Select className="mt-1" value={canvas.orientation}
          onChange={(e) => applyOrientation(e.target.value as "portrait" | "landscape")}>
          <option value="portrait">Portrait (1080 × 1920)</option>
          <option value="landscape">Landscape (1920 × 1080)</option>
        </Select>
      </label>

      {/* Background media upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-zinc-500">App background</div>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 capitalize">{activePage}</span>
        </div>

        {/* Current background preview */}
        {bgVideo ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            <video src={bgVideo} autoPlay loop muted playsInline
              className="h-28 w-full object-cover" />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <Film className="size-2.5" /> VIDEO
              </span>
              <button onClick={clearBg} className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500">
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : bgImage ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgImage} alt="bg" className="h-28 w-full object-cover" />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <ImageIcon className="size-2.5" /> IMAGE
              </span>
              <button onClick={clearBg} className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500">
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-4 text-center transition-colors",
            dragOver ? "border-blue-400 bg-blue-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300",
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
          <Upload className="size-4 text-zinc-400" />
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-zinc-600">
              {uploading ? "Uploading…" : hasBg ? "Click or drop to replace" : "Upload app design"}
            </div>
            <div className="text-[10px] text-zinc-400">
              Image (JPG/PNG/WebP, max 8 MB) · Video (MP4/WebM, max 200 MB)
            </div>
          </div>
        </div>

        {/* URL input */}
        <label className="block text-xs font-medium text-zinc-500">
          Or paste URL
          <Input
            className="mt-1 font-mono text-[11px]"
            placeholder="https://…"
            value={bgImage ?? bgVideo ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const isVideo = /\.(mp4|webm|mov)($|\?)/i.test(v);
              if (isVideo) setPageBackground(activePage, { video: v || undefined, image: undefined });
              else setPageBackground(activePage, { image: v || undefined, video: undefined });
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
    </div>
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
  const itemClass = "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-zinc-100";

  return (
    <div
      className="fixed z-50 w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-2xl"
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {node ? (
        <>
          <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">{node.type}</div>
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
            {node.visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {node.visible ? "Hide" : "Show"}
          </button>
          <button type="button" className={itemClass} onClick={onToggleLock}>
            {node.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
            {node.locked ? "Unlock" : "Lock"}
          </button>
          <div className="my-1 h-px bg-zinc-100" />
          <button type="button" className={cn(itemClass, "text-red-600 hover:bg-red-50")} onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </>
      ) : (
        <>
          <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Add component</div>
          {(["text", "button", "image", "background-decoration"] as BuilderComponentType[]).map((type) => (
            <button key={type} type="button" className={itemClass} onClick={() => onAddNode(type)}>
              <Plus className="size-3.5" />
              {type}
            </button>
          ))}
        </>
      )}
      <button type="button" className={cn(itemClass, "mt-1 text-zinc-500")} onClick={onClose}>
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
  const selectNode = useBuilderStore((state) => state.selectNode);
  const canvas = useBuilderStore((state) => state.canvas);
  const nodes = useBuilderStore((state) => state.nodes);
  const updateNode = useBuilderStore((state) => state.updateNode);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const addNode = useBuilderStore((state) => state.addNode);
  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const toggleNode = useBuilderStore((state) => state.toggleNode);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const reorderNodes = useBuilderStore((state) => state.reorderNodes);
  const schema = useBuilderStore((state) => state.schema);
  const setSchema = useBuilderStore((state) => state.setSchema);
  const { data: savedLayout } = useActiveLayoutSchema();
  const hydratedLayoutId = useRef<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);

  // ── Zoom / Pan ────────────────────────────────────────────
  const [zoom, setZoom] = useState(0.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const spaceRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const clampZoom = useCallback((z: number) => Math.min(4, Math.max(0.1, z)), []);

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
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat) spaceRef.current = true; };
    const offKey = (e: KeyboardEvent) => { if (e.code === "Space") spaceRef.current = false; };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", offKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", offKey); };
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || spaceRef.current) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    setPan({ x: panStartRef.current.px + (e.clientX - panStartRef.current.mx), y: panStartRef.current.py + (e.clientY - panStartRef.current.my) });
  };
  const handleCanvasMouseUp = () => { isPanningRef.current = false; };
  // ── end Zoom/Pan ──────────────────────────────────────────

  const visibleNodes = nodes.filter((node) => node.page === activePage).sort((a, b) => a.zIndex - b.zIndex);
  const selectedNode = nodes.find((node) => node.id === selectedId);
  const contextNode = contextMenu?.nodeId ? nodes.find((node) => node.id === contextMenu.nodeId) : undefined;

  useEffect(() => {
    if (!savedLayout || hydratedLayoutId.current === savedLayout.id) return;
    setSchema(savedLayout.schema);
    hydratedLayoutId.current = savedLayout.id;
  }, [savedLayout, setSchema]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("blur", close); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping = ["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement)?.tagName ?? "") || (e.target as HTMLElement)?.isContentEditable;
      if (isTyping || !selectedNode || selectedNode.locked) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteNode(selectedNode.id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteNode, selectedNode]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = visibleNodes.findIndex((n) => n.id === event.active.id);
    const newIndex = visibleNodes.findIndex((n) => n.id === event.over?.id);
    reorderNodes(arrayMove(visibleNodes, oldIndex, newIndex).map((n) => n.id));
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try { await adminService.publishLayoutSchema(schema()); toast.success("Layout published to Supabase"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Publish failed"); }
    finally { setIsPublishing(false); }
  };

  const startTextEdit = (node: BuilderNode) => {
    if (!isEditableTextNode(node) || node.locked) return;
    selectNode(node.id); setEditingId(node.id);
    setEditValue(readString(node.props.content, readString(node.props.label, "")));
  };
  const commitTextEdit = () => {
    const node = nodes.find((n) => n.id === editingId);
    if (!node) return;
    updateNodeProps(node.id, node.type === "button" ? { label: editValue } : { content: editValue });
    setEditingId(null);
  };
  const cancelTextEdit = () => { setEditingId(null); setEditValue(""); };
  const bringNodeToFront = (node: BuilderNode) => { const max = Math.max(...nodes.filter((n) => n.page === node.page).map((n) => n.zIndex)); updateNode(node.id, { zIndex: max + 1 }); };
  const sendNodeToBack = (node: BuilderNode) => { const min = Math.min(...nodes.filter((n) => n.page === node.page).map((n) => n.zIndex)); updateNode(node.id, { zIndex: min - 1 }); };
  const runContextAction = (action: () => void) => { action(); setContextMenu(null); };

  const toolbarBtn = "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors";

  return (
    <div className="-mx-4 -my-6 flex flex-col overflow-hidden lg:-mx-8" style={{ height: "calc(100vh - 4rem)" }}>
      {/* ── Top toolbar ──────────────────────────────── */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-zinc-200 bg-white px-3">
        {/* Screen tabs */}
        <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5">
          {pageLabels.map((page) => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={cn(
                "rounded-md px-3 py-1 text-[11px] font-medium capitalize transition-colors",
                activePage === page ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {page}
            </button>
          ))}
        </div>

        <div className="mx-2 h-4 w-px bg-zinc-200" />

        {/* Zoom */}
        <button className={toolbarBtn} onClick={() => setZoom((z) => clampZoom(z - 0.1))}><ZoomOut className="size-3.5" /></button>
        <button
          className="w-14 rounded-md px-1 py-1 text-center text-xs font-mono text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          onClick={() => { setZoom(0.72); setPan({ x: 0, y: 0 }); }}
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className={toolbarBtn} onClick={() => setZoom((z) => clampZoom(z + 0.1))}><ZoomIn className="size-3.5" /></button>

        <div className="mx-2 h-4 w-px bg-zinc-200" />

        {/* Undo / Redo */}
        <button className={toolbarBtn} onClick={undo}><Undo2 className="size-3.5" /></button>
        <button className={toolbarBtn} onClick={redo}><Redo2 className="size-3.5" /></button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-400"><Smartphone className="inline size-3.5" /> {canvas.width}×{canvas.height}</span>
          <button className={toolbarBtn}><Monitor className="size-3.5" />Preview</button>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {isPublishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar — Layers ──────────────────── */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Layers</span>
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">{visibleNodes.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleNodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5 px-2 pb-2">
                  {visibleNodes.map((node) => <SortableLayer key={node.id} node={node} />)}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
          <div className="border-t border-zinc-200 p-2">
            <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Add</div>
            <div className="grid grid-cols-1 gap-0.5">
              {componentTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => addNode(type)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <Plus className="size-3 shrink-0 text-zinc-400" />
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Canvas area ───────────────────────────── */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden"
          style={{ background: "#F0F0F2", cursor: isPanningRef.current ? "grabbing" : spaceRef.current ? "grab" : "default" }}
          onClick={() => selectNode(null)}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={(e) => { e.preventDefault(); selectNode(null); setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null }); }}
        >
          {/* Dot grid */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle,rgba(0,0,0,0.10) 1px,transparent 1px)",
              backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
              backgroundPosition: `${pan.x % (22 * zoom)}px ${pan.y % (22 * zoom)}px`,
            }}
          />

          {/* Transform wrapper — centered + panned */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="pointer-events-auto relative"
              style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }}
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
                  backgroundImage: canvas.pageBackgrounds?.[activePage]?.image
                    ? `url(${canvas.pageBackgrounds[activePage]!.image})`
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
                {/* Per-page video background */}
                {canvas.pageBackgrounds?.[activePage]?.video ? (
                  <video
                    src={canvas.pageBackgrounds[activePage]!.video}
                    autoPlay loop muted playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ zIndex: 0 }}
                  />
                ) : null}
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
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); selectNode(node.id); }}
                      onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); selectNode(node.id); setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id }); }}
                      onDragStop={(_, d) => updateNode(node.id, { x: snap(d.x), y: snap(d.y) })}
                      onResizeStop={(_, __, ref, ___, pos) => updateNode(node.id, { width: snap(ref.offsetWidth), height: snap(ref.offsetHeight), x: snap(pos.x), y: snap(pos.y) })}
                      style={{ zIndex: node.zIndex, opacity: node.opacity, transform: `rotate(${node.rotation}deg)` }}
                      className={cn("group", selectedId === node.id && "outline outline-2 outline-offset-1 outline-zinc-950", node.locked && "cursor-not-allowed")}
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
            Ctrl+scroll to zoom · Space+drag to pan
          </div>
        </div>

        {/* ── Right sidebar — Properties ─────────────── */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Properties</span>
            <AlignCenter className="size-3.5 text-zinc-300" />
          </div>
          <ScrollArea className="flex-1 px-3 pb-4">
            <CanvasControls />
            <PropertiesPanel selectedNode={selectedNode} onStartEdit={startTextEdit} />
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Schema</span>
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
          x={contextMenu.x} y={contextMenu.y} node={contextNode}
          onClose={() => setContextMenu(null)}
          onEditText={() => contextNode && runContextAction(() => startTextEdit(contextNode))}
          onDuplicate={() => contextNode && runContextAction(() => duplicateNode(contextNode.id))}
          onDelete={() => contextNode && runContextAction(() => deleteNode(contextNode.id))}
          onToggleLock={() => contextNode && runContextAction(() => toggleNode(contextNode.id, "locked"))}
          onToggleVisible={() => contextNode && runContextAction(() => toggleNode(contextNode.id, "visible"))}
          onBringToFront={() => contextNode && runContextAction(() => bringNodeToFront(contextNode))}
          onSendToBack={() => contextNode && runContextAction(() => sendNodeToBack(contextNode))}
          onAddNode={(type) => runContextAction(() => addNode(type))}
        />
      ) : null}
    </div>
  );
}
