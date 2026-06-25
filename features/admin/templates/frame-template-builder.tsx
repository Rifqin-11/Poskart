"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BringToFront,
  CalendarDays,
  ChevronRight,
  Clipboard,
  Copy,
  Crosshair,
  Grid2X2,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Scissors,
  SendToBack,
  Square,
  Trash2,
  Type,
  Redo2,
  Undo2,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useTouchContextMenu } from "@/lib/hooks/use-touch-context-menu";
import { uploadBuilderImage } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import {
  DEFAULT_FRAME_CANVAS,
  type FrameLayout,
  type FrameNode,
  type FrameNodeType,
} from "@/types/frame-template";

const FRAME_NODE_TYPES: {
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
const FRAME_SNAP_THRESHOLD = 8;

function clampZoom(value: number) {
  return Math.min(2, Math.max(0.02, Number(value.toFixed(2))));
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function normalizeFrameLayout(layout: FrameLayout): FrameLayout {
  return layout;
}

function resizeFrameLayout(
  layout: FrameLayout,
  width: number,
  height: number,
): FrameLayout {
  const nextWidth = Math.max(1, Math.round(width));
  const nextHeight = Math.max(1, Math.round(height));
  const scaleX = nextWidth / Math.max(1, layout.canvas.width);
  const scaleY = nextHeight / Math.max(1, layout.canvas.height);

  return {
    ...layout,
    canvas: {
      ...layout.canvas,
      width: nextWidth,
      height: nextHeight,
    },
    nodes: layout.nodes.map((node) =>
      node.id === "frame-background"
        ? {
            ...node,
            x: 0,
            y: 0,
            width: nextWidth,
            height: nextHeight,
          }
        : {
            ...node,
            x: Math.round(node.x * scaleX),
            y: Math.round(node.y * scaleY),
            width: Math.max(1, Math.round(node.width * scaleX)),
            height: Math.max(1, Math.round(node.height * scaleY)),
          },
    ),
  };
}

function upsertFrameBackground(
  layout: FrameLayout,
  frameImageUrl?: string,
): FrameLayout {
  const src = frameImageUrl?.trim();
  const frameBackgroundId = "frame-background";

  if (!src) {
    return {
      ...layout,
      nodes: layout.nodes.filter((node) => node.id !== frameBackgroundId),
    };
  }

  const backgroundNode: FrameNode = {
    id: frameBackgroundId,
    type: "background",
    x: 0,
    y: 0,
    width: layout.canvas.width,
    height: layout.canvas.height,
    rotation: 0,
    opacity: 1,
    zIndex: 0,
    locked: true,
    props: { src, alt: "Frame background", objectFit: "cover", radius: 0 },
  };

  const hasBackground = layout.nodes.some(
    (node) => node.id === frameBackgroundId,
  );

  return {
    ...layout,
    nodes: hasBackground
      ? layout.nodes.map((node) =>
          node.id === frameBackgroundId
            ? {
                ...node,
                x: 0,
                y: 0,
                width: layout.canvas.width,
                height: layout.canvas.height,
                locked: true,
                props: {
                  ...node.props,
                  src,
                  alt: "Frame background",
                  objectFit: "cover",
                  radius: 0,
                },
              }
            : node,
        )
      : [backgroundNode, ...layout.nodes],
  };
}

function createDefaultFrameLayout({
  frameImageUrl,
}: {
  frameImageUrl?: string;
}): FrameLayout {
  const canvas = { ...DEFAULT_FRAME_CANVAS };
  const nodes: FrameNode[] = [];

  if (frameImageUrl) {
    nodes.unshift({
      id: "frame-background",
      type: "background",
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      locked: true,
      props: { src: frameImageUrl, objectFit: "cover", radius: 0 },
    });
  }

  return { version: 1, canvas, nodes };
}

function createNode(type: FrameNodeType, layout: FrameLayout): FrameNode {
  const zIndex = Math.max(0, ...layout.nodes.map((node) => node.zIndex)) + 1;
  const base = {
    id: `${type}-${Date.now()}`,
    type,
    x: 48,
    y: 88,
    width: type === "text" || type === "date-stamp" ? 180 : 132,
    height: type === "text" || type === "date-stamp" ? 40 : 132,
    rotation: 0,
    opacity: 1,
    zIndex,
    locked: false,
  };

  if (type === "photo-slot") {
    return {
      ...base,
      width: 160,
      height: 210,
      props: {
        label: "Photo",
        background: "#f4f4f5",
        borderColor: "#d4d4d8",
        radius: 10,
      },
    };
  }

  if (type === "image" || type === "background") {
    return {
      ...base,
      props: {
        src: "",
        alt: type,
        objectFit: "cover",
        radius: type === "background" ? 0 : 8,
      },
    };
  }

  if (type === "border") {
    return {
      ...base,
      width: 260,
      height: 360,
      props: { borderColor: "#18181b", borderWidth: 2, radius: 18 },
    };
  }

  return {
    ...base,
    props: {
      content: type === "date-stamp" ? "DD.MM.YYYY" : "Text",
      color: "#18181b",
      fontSize: 18,
      fontWeight: 600,
    },
  };
}

function normalizePhotoSlotLabels(nodes: FrameNode[]): FrameNode[] {
  const photoSlots = nodes.filter((node) => node.type === "photo-slot");
  const slotIdToIndex = new Map(
    photoSlots.map((node, index) => [node.id, index]),
  );

  return nodes.map((node) => {
    if (node.type !== "photo-slot") return node;
    const index = slotIdToIndex.get(node.id);
    if (index === undefined) return node;
    return {
      ...node,
      props: {
        ...node.props,
        label: `Photo ${index + 1}`,
      },
    };
  });
}

function FrameNodeRenderer({ node }: { node: FrameNode }) {
  if (node.type === "photo-slot") {
    return (
      <div
        className="grid h-full w-full place-items-center border-2 border-dashed text-center text-xs font-medium text-zinc-500"
        style={{
          background: readString(node.props.background, "#f4f4f5"),
          borderColor: readString(node.props.borderColor, "#d4d4d8"),
          borderRadius: readNumber(node.props.radius, 10),
        }}
      >
        {readString(node.props.label, "Photo")}
      </div>
    );
  }

  if (node.type === "image" || node.type === "background") {
    const src = readString(node.props.src, "");
    const fit = readString(node.props.objectFit, "cover");
    if (src) {
      return (
        <div
          className="h-full w-full bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: fit === "fill" ? "100% 100%" : fit,
            borderRadius: readNumber(node.props.radius, 8),
          }}
        />
      );
    }

    return (
      <div className="grid h-full w-full place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-100 text-xs font-medium text-zinc-500">
        {node.type}
      </div>
    );
  }

  if (node.type === "border") {
    return (
      <div
        className="h-full w-full"
        style={{
          border: `${readNumber(node.props.borderWidth, 2)}px solid ${readString(node.props.borderColor, "#18181b")}`,
          borderRadius: readNumber(node.props.radius, 18),
        }}
      />
    );
  }

  return (
    <div
      className="flex h-full w-full items-center"
      style={{
        color: readString(node.props.color, "#18181b"),
        fontSize: readNumber(node.props.fontSize, 18),
        fontWeight: readNumber(node.props.fontWeight, 600),
      }}
    >
      {readString(
        node.props.content,
        node.type === "date-stamp" ? "DD.MM.YYYY" : "Text",
      )}
    </div>
  );
}

function SortableFrameLayer({
  node,
  selectedId,
  onSelect,
  onToggleLock,
}: {
  node: FrameNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleLock: (id: string, locked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.id, disabled: false });
  const isSelected = selectedId === node.id;

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
          "flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-400 active:cursor-grabbing",
          isSelected && "text-zinc-300",
        )}
        aria-label={`Reorder ${node.id}`}
        title="Drag to reorder layer"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onSelect(node.id)}
      >
        <span className={cn("block font-medium", isSelected && "text-white")}>
          {node.type === "photo-slot"
            ? readString(node.props.label, "Photo slot")
            : node.type}
        </span>
        <span
          className={cn(
            "block truncate text-zinc-500",
            isSelected && "text-zinc-300",
          )}
        >
          {node.id}
        </span>
      </button>
      <button
        className={cn(
          "text-zinc-400 hover:text-zinc-700",
          isSelected && "hover:text-white",
        )}
        title={node.locked ? "Unlock layer" : "Lock layer"}
        onClick={() => onToggleLock(node.id, !node.locked)}
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

function FrameContextMenu({
  x,
  y,
  node,
  hasClipboard,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onToggleLock,
  onAddNode,
}: {
  x: number;
  y: number;
  node?: FrameNode;
  hasClipboard: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onToggleLock: () => void;
  onAddNode: (type: FrameNodeType) => void;
}) {
  const [layerHover, setLayerHover] = useState(false);
  const menuW = 224;
  const safeX = Math.min(x, window.innerWidth - menuW - 8);
  const safeY = Math.min(y, window.innerHeight - 360);
  const item =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 transition-colors";
  const kbd = "ml-auto text-[10px] font-mono text-zinc-400";

  return (
    <div
      className="fixed z-[9999] w-56 rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl"
      style={{ left: safeX, top: safeY }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {node ? (
        <>
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {node.type}
          </div>

          {/* Clipboard */}
          <button type="button" className={item} onClick={onCopy}>
            <Copy className="size-3.5" />
            Copy<span className={kbd}>⌘C</span>
          </button>
          {node.type !== "photo-slot" && node.id !== "frame-background" && (
            <button type="button" className={item} onClick={onCut}>
              <Scissors className="size-3.5" />
              Cut<span className={kbd}>⌘X</span>
            </button>
          )}
          {node.id !== "frame-background" && (
            <button type="button" className={item} onClick={onDuplicate}>
              <Copy className="size-3.5 opacity-50" />
              Duplicate<span className={kbd}>⌘D</span>
            </button>
          )}

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          {/* Layer order submenu */}
          <div
            className="relative"
            onMouseEnter={() => setLayerHover(true)}
            onMouseLeave={() => setLayerHover(false)}
          >
            <button
              type="button"
              className={cn(item, layerHover && "bg-zinc-100")}
            >
              <Layers className="size-3.5" />
              Layer order
              <ChevronRight className="ml-auto size-3.5 text-zinc-400" />
            </button>
            {layerHover && (
              <div className="absolute left-full top-0 ml-1 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl">
                <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Layer order
                </div>
                <button type="button" className={item} onClick={onBringToFront}>
                  <BringToFront className="size-3.5" />
                  Bring to front
                </button>
                <button type="button" className={item} onClick={onBringForward}>
                  <ArrowUpToLine className="size-3.5" />
                  Bring forward
                </button>
                <button type="button" className={item} onClick={onSendBackward}>
                  <ArrowDownToLine className="size-3.5" />
                  Send backward
                </button>
                <button type="button" className={item} onClick={onSendToBack}>
                  <SendToBack className="size-3.5" />
                  Send to back
                </button>
              </div>
            )}
          </div>

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          <button type="button" className={item} onClick={onToggleLock}>
            {node.locked ? (
              <Unlock className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            {node.locked ? "Unlock" : "Lock"}
          </button>

          {node.id !== "frame-background" ? (
            <>
              <div className="mx-2 my-1 h-px bg-zinc-100" />
              <button
                type="button"
                className={cn(item, "text-red-600 hover:bg-red-50")}
                onClick={onDelete}
                disabled={node.id === "frame-background"}
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </>
          ) : null}
        </>
      ) : (
        <>
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Canvas
          </div>
          {hasClipboard && (
            <button type="button" className={item} onClick={onPaste}>
              <Clipboard className="size-3.5" />
              Paste<span className={kbd}>⌘V</span>
            </button>
          )}
          {hasClipboard && <div className="mx-2 my-1 h-px bg-zinc-100" />}
          <div className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Add layer
          </div>
          {FRAME_NODE_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              className={item}
              onClick={() => onAddNode(t.type)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </>
      )}
      <div className="mx-2 my-1 h-px bg-zinc-100" />
      <button
        type="button"
        className={cn(item, "text-zinc-400 hover:text-zinc-600")}
        onClick={onClose}
      >
        <X className="size-3.5" />
        Close
      </button>
    </div>
  );
}

export function FrameTemplateBuilder({
  open = true,
  presentation = "modal",
  resetKey = "default",
  initialLayout,
  templateName,
  frameImageUrl,
  frameImageDimensions,
  onClose,
  onSave,
  saveLabel = "Save frame layout",
  detailsPanel,
}: {
  open?: boolean;
  presentation?: "modal" | "embedded";
  resetKey?: string;
  initialLayout: FrameLayout | null;
  templateName: string;
  frameImageUrl?: string;
  frameImageDimensions?: { width: number; height: number } | null;
  onClose: () => void;
  onSave: (layout: FrameLayout) => void;
  saveLabel?: string;
  detailsPanel?: ReactNode;
}) {
  const fallbackLayout = useMemo(
    () => createDefaultFrameLayout({ frameImageUrl }),
    [frameImageUrl],
  );
  const [layout, setLayout] = useState<FrameLayout>(
    normalizeFrameLayout(initialLayout ?? fallbackLayout),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [guides, setGuides] = useState<Array<{ type: "h" | "v"; pos: number }>>(
    [],
  );
  const [snapPreview, setSnapPreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [history, setHistory] = useState<{
    past: FrameLayout[];
    future: FrameLayout[];
  }>({ past: [], future: [] });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);
  const [clipboard, setClipboard] = useState<FrameNode | null>(null);
  const fullView = useBuilderStore((s) => s.builderFullView);
  const setFullView = useBuilderStore((s) => s.setBuilderFullView);
  const hydratedKeyRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const spaceRef = useRef(false);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef(0);
  const touchStartZoomRef = useRef(1);
  const touchStartMidRef = useRef({ x: 0, y: 0 });
  const touchStartPanRef = useRef({ x: 0, y: 0 });
  const latestZoomRef = useRef(zoom);
  const latestPanRef = useRef(pan);
  const longPressNodeRef = useRef<string | null>(null);
  const selectedNode = layout.nodes.find((node) => node.id === selectedId);
  const contextNode = contextMenu?.nodeId
    ? layout.nodes.find((node) => node.id === contextMenu.nodeId)
    : undefined;
  const layers = layout.nodes.slice().sort((a, b) => b.zIndex - a.zIndex);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  useEffect(() => {
    latestZoomRef.current = zoom;
    latestPanRef.current = pan;
  }, [pan, zoom]);
  const canvasTouchMenu = useTouchContextMenu(({ x, y }) => {
    setSelectedId(null);
    setContextMenu({ x, y, nodeId: null });
  });
  const nodeTouchMenu = useTouchContextMenu(({ x, y }) => {
    if (longPressNodeRef.current) {
      setContextMenu({ x, y, nodeId: longPressNodeRef.current });
    }
  });

  const fitToScreen = useCallback(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    const padding = 88;
    const scaleX = (viewport.clientWidth - padding * 2) / layout.canvas.width;
    const scaleY = (viewport.clientHeight - padding * 2) / layout.canvas.height;
    setZoom(clampZoom(Math.min(scaleX, scaleY)));
    setPan({ x: 0, y: 0 });
  }, [layout.canvas.height, layout.canvas.width]);

  const panToNode = useCallback(
    (nodeId: string) => {
      const node = layout.nodes.find((item) => item.id === nodeId);
      if (!node) return;
      const nodeCenterX = node.x + node.width / 2 - layout.canvas.width / 2;
      const nodeCenterY = node.y + node.height / 2 - layout.canvas.height / 2;
      setPan({ x: -nodeCenterX * zoom, y: -nodeCenterY * zoom });
    },
    [layout.canvas.height, layout.canvas.width, layout.nodes, zoom],
  );

  const commitLayout = useCallback(
    (updater: (current: FrameLayout) => FrameLayout) => {
      const nextLayout = updater(layout);
      if (nextLayout === layout) return;

      setHistory((current) => ({
        past: [...current.past.slice(-49), layout],
        future: [],
      }));
      setLayout(nextLayout);
    },
    [layout],
  );

  const undo = useCallback(() => {
    const previous = history.past.at(-1);
    if (!previous) return;

    setLayout(previous);
    setHistory({
      past: history.past.slice(0, -1),
      future: [layout, ...history.future].slice(0, 50),
    });
    setSelectedId(null);
    setGuides([]);
    setSnapPreview(null);
  }, [history.future, history.past, layout]);

  const redo = useCallback(() => {
    const next = history.future[0];
    if (!next) return;

    setLayout(next);
    setHistory({
      past: [...history.past.slice(-49), layout],
      future: history.future.slice(1),
    });
    setSelectedId(null);
    setGuides([]);
    setSnapPreview(null);
  }, [history.future, history.past, layout]);

  useEffect(() => {
    if (!open) return;
    if (hydratedKeyRef.current === resetKey) return;
    hydratedKeyRef.current = resetKey;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLayout(normalizeFrameLayout(initialLayout ?? fallbackLayout));
      setSelectedId(null);
      setHistory({ past: [], future: [] });
    });
    return () => {
      cancelled = true;
    };
  }, [fallbackLayout, initialLayout, open, resetKey]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLayout((current) => {
        const resized = frameImageDimensions
          ? resizeFrameLayout(
              current,
              frameImageDimensions.width,
              frameImageDimensions.height,
            )
          : current;
        return upsertFrameBackground(resized, frameImageUrl);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [
    frameImageDimensions?.height,
    frameImageDimensions?.width,
    frameImageUrl,
    open,
  ]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    fitToScreen();
  }, [fitToScreen, open, resetKey]);

  useEffect(() => {
    if (!open) return;
    const surface = canvasSurfaceRef.current;
    if (!surface) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const factor = event.deltaY < 0 ? 1.08 : 0.93;
        setZoom((value) => clampZoom(value * factor));
        return;
      }
      setPan((value) => ({
        x: value.x - event.deltaX,
        y: value.y - event.deltaY,
      }));
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      const [first, second] = [event.touches[0], event.touches[1]];
      touchStartDistRef.current = Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY,
      );
      touchStartZoomRef.current = latestZoomRef.current;
      touchStartMidRef.current = {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
      };
      touchStartPanRef.current = { ...latestPanRef.current };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const [first, second] = [event.touches[0], event.touches[1]];
      const distance = Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY,
      );
      if (touchStartDistRef.current > 0) {
        setZoom(
          clampZoom(
            touchStartZoomRef.current * (distance / touchStartDistRef.current),
          ),
        );
      }
      const midpoint = {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
      };
      setPan({
        x: touchStartPanRef.current.x + midpoint.x - touchStartMidRef.current.x,
        y: touchStartPanRef.current.y + midpoint.y - touchStartMidRef.current.y,
      });
    };

    surface.addEventListener("wheel", handleWheel, { passive: false });
    surface.addEventListener("touchstart", handleTouchStart, { passive: true });
    surface.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      surface.removeEventListener("wheel", handleWheel);
      surface.removeEventListener("touchstart", handleTouchStart);
      surface.removeEventListener("touchmove", handleTouchMove);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;

      const cmd = event.metaKey || event.ctrlKey;

      if (cmd && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if (cmd && event.key === "c") {
        event.preventDefault();
        const node = layout.nodes.find((n) => n.id === selectedId);
        if (node) setClipboard({ ...node });
        return;
      }
      if (cmd && event.key === "x") {
        event.preventDefault();
        const node = layout.nodes.find((n) => n.id === selectedId);
        if (node && !node.locked && node.id !== "frame-background") {
          setClipboard({ ...node });
          commitLayout((c) => ({
            ...c,
            nodes: normalizePhotoSlotLabels(
              c.nodes.filter((n) => n.id !== node.id),
            ),
          }));
          setSelectedId(null);
        }
        return;
      }
      if (cmd && event.key === "v") {
        event.preventDefault();
        setClipboard((cb) => {
          if (!cb) return cb;
          const clone: FrameNode = {
            ...cb,
            id: `${cb.id}-paste-${Date.now()}`,
            x: cb.x + 18,
            y: cb.y + 18,
            locked: false,
            zIndex: Math.max(0, ...layout.nodes.map((n) => n.zIndex)) + 1,
          };
          commitLayout((c) => ({
            ...c,
            nodes: normalizePhotoSlotLabels([...c.nodes, clone]),
          }));
          setSelectedId(clone.id);
          return cb; // keep clipboard
        });
        return;
      }
      if (cmd && event.key === "d") {
        event.preventDefault();
        const node = layout.nodes.find((n) => n.id === selectedId);
        if (node && node.id !== "frame-background") {
          const clone = {
            ...node,
            id: `${node.id}-copy-${Date.now()}`,
            x: node.x + 18,
            y: node.y + 18,
            locked: false,
          };
          commitLayout((c) => ({
            ...c,
            nodes: normalizePhotoSlotLabels([...c.nodes, clone]),
          }));
          setSelectedId(clone.id);
        }
        return;
      }
      if (event.code === "Space" && !event.repeat) {
        spaceRef.current = true;
        setSpaceDown(true);
      }
      if (event.shiftKey && event.key === "1") {
        event.preventDefault();
        fitToScreen();
      }
      if (event.shiftKey && event.key === "2") {
        event.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
      if ((event.key === "f" || event.key === "F") && !cmd) {
        event.preventDefault();
        selectedId ? panToNode(selectedId) : fitToScreen();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceRef.current = false;
        setSpaceDown(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fitToScreen,
    open,
    panToNode,
    redo,
    selectedId,
    undo,
    layout.nodes,
    commitLayout,
  ]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (isTyping || !selectedNode || selectedNode.locked) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (selectedNode.id === "frame-background") return;
        commitLayout((current) => ({
          ...current,
          nodes: normalizePhotoSlotLabels(
            current.nodes.filter((node) => node.id !== selectedNode.id),
          ),
        }));
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commitLayout, open, selectedNode]);

  if (!open) return null;

  const updateCanvas = (patch: Partial<FrameLayout["canvas"]>) =>
    commitLayout((current) => {
      const canvas = { ...current.canvas, ...patch };
      return {
        ...current,
        canvas,
        nodes: current.nodes.map((node) =>
          node.id === "frame-background"
            ? {
                ...node,
                x: 0,
                y: 0,
                width: canvas.width,
                height: canvas.height,
              }
            : node,
        ),
      };
    });

  const updateNode = (id: string, patch: Partial<FrameNode>) =>
    commitLayout((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === id ? { ...node, ...patch } : node,
      ),
    }));

  const updateNodeProps = (id: string, props: Record<string, unknown>) =>
    commitLayout((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === id ? { ...node, props: { ...node.props, ...props } } : node,
      ),
    }));

  const computeGuides = (
    node: FrameNode,
    rawX: number,
    rawY: number,
    width = node.width,
    height = node.height,
  ) => {
    const nextGuides: Array<{ type: "h" | "v"; pos: number }> = [];
    const nodeCenterX = rawX + width / 2;
    const nodeCenterY = rawY + height / 2;
    const canvasCenterX = layout.canvas.width / 2;
    const canvasCenterY = layout.canvas.height / 2;

    if (Math.abs(nodeCenterX - canvasCenterX) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "v", pos: canvasCenterX });
    }
    if (Math.abs(nodeCenterY - canvasCenterY) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "h", pos: canvasCenterY });
    }
    if (Math.abs(rawX) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "v", pos: 0 });
    }
    if (Math.abs(rawX + width - layout.canvas.width) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "v", pos: layout.canvas.width });
    }
    if (Math.abs(rawY) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "h", pos: 0 });
    }
    if (Math.abs(rawY + height - layout.canvas.height) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "h", pos: layout.canvas.height });
    }

    layout.nodes
      .filter((item) => item.id !== node.id && item.id !== "frame-background")
      .forEach((other) => {
        const otherCenterX = other.x + other.width / 2;
        const otherCenterY = other.y + other.height / 2;

        if (Math.abs(nodeCenterX - otherCenterX) < FRAME_SNAP_THRESHOLD) {
          nextGuides.push({ type: "v", pos: otherCenterX });
        }
        if (Math.abs(nodeCenterY - otherCenterY) < FRAME_SNAP_THRESHOLD) {
          nextGuides.push({ type: "h", pos: otherCenterY });
        }
        if (Math.abs(rawX - other.x) < FRAME_SNAP_THRESHOLD) {
          nextGuides.push({ type: "v", pos: other.x });
        }
        if (
          Math.abs(rawX + width - (other.x + other.width)) <
          FRAME_SNAP_THRESHOLD
        ) {
          nextGuides.push({ type: "v", pos: other.x + other.width });
        }
        if (Math.abs(rawY - other.y) < FRAME_SNAP_THRESHOLD) {
          nextGuides.push({ type: "h", pos: other.y });
        }
        if (
          Math.abs(rawY + height - (other.y + other.height)) <
          FRAME_SNAP_THRESHOLD
        ) {
          nextGuides.push({ type: "h", pos: other.y + other.height });
        }
      });

    return {
      guides: nextGuides,
      sx: rawX,
      sy: rawY,
      w: width,
      h: height,
      isSnapping: nextGuides.length > 0,
    };
  };

  const clearSnap = () => {
    setGuides([]);
    setSnapPreview(null);
  };

  const addNode = (type: FrameNodeType) => {
    const node = createNode(type, layout);
    commitLayout((current) => ({
      ...current,
      nodes: normalizePhotoSlotLabels([...current.nodes, node]),
    }));
    setSelectedId(node.id);
  };

  const duplicateNode = (node: FrameNode) => {
    if (node.id === "frame-background") {
      toast.error("Frame background follows the Frame image URL field.");
      return;
    }

    const clone = {
      ...node,
      id: `${node.id}-copy-${Date.now()}`,
      x: node.x + 18,
      y: node.y + 18,
      locked: false,
    };
    commitLayout((current) => ({
      ...current,
      nodes: normalizePhotoSlotLabels([...current.nodes, clone]),
    }));
    setSelectedId(clone.id);
  };

  const deleteNode = (node: FrameNode) => {
    if (node.id === "frame-background") {
      toast.error("Clear the Frame image URL field to remove the background.");
      return;
    }

    commitLayout((current) => ({
      ...current,
      nodes: normalizePhotoSlotLabels(
        current.nodes.filter((item) => item.id !== node.id),
      ),
    }));
    setSelectedId(null);
  };

  const moveLayer = (id: string, direction: "up" | "down") => {
    commitLayout((current) => {
      const ordered = current.nodes
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((node, index) => ({ ...node, zIndex: index + 1 }));
      const index = ordered.findIndex((node) => node.id === id);
      const targetIndex = direction === "up" ? index + 1 : index - 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return current;
      }

      const moved = ordered.slice();
      [moved[index], moved[targetIndex]] = [moved[targetIndex], moved[index]];
      const byId = new Map(
        moved.map((node, nextIndex) => [
          node.id,
          { ...node, zIndex: nextIndex + 1 },
        ]),
      );

      return {
        ...current,
        nodes: current.nodes.map((node) => byId.get(node.id) ?? node),
      };
    });
  };

  const bringNodeToFront = (node: FrameNode) => {
    const maxZIndex = Math.max(...layout.nodes.map((item) => item.zIndex));
    updateNode(node.id, { zIndex: maxZIndex + 1 });
  };

  const sendNodeToBack = (node: FrameNode) => {
    const minZIndex = Math.min(...layout.nodes.map((item) => item.zIndex));
    updateNode(node.id, { zIndex: minZIndex - 1 });
  };

  const reorderLayers = (topToBottomIds: string[]) => {
    commitLayout((current) => {
      const bottomToTopIds = topToBottomIds.slice().reverse();
      const nextZIndexById = new Map(
        bottomToTopIds.map((id, index) => [id, index + 1]),
      );

      return {
        ...current,
        nodes: current.nodes.map((node) => {
          const nextZIndex = nextZIndexById.get(node.id);
          return nextZIndex != null ? { ...node, zIndex: nextZIndex } : node;
        }),
      };
    });
  };

  const handleLayerDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = layers.findIndex((node) => node.id === event.active.id);
    const newIndex = layers.findIndex((node) => node.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderLayers(arrayMove(layers, oldIndex, newIndex).map((node) => node.id));
  };

  const runContextAction = (action: () => void) => {
    action();
    setContextMenu(null);
  };

  const handleCanvasMouseDown = (event: React.MouseEvent) => {
    if (event.button === 1 || spaceRef.current) {
      event.preventDefault();
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = {
        mx: event.clientX,
        my: event.clientY,
        px: pan.x,
        py: pan.y,
      };
      return;
    }

    if (!(event.target as HTMLElement).closest(".frame-rnd-node")) {
      setSelectedId(null);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    setPan({
      x: panStartRef.current.px + (event.clientX - panStartRef.current.mx),
      y: panStartRef.current.py + (event.clientY - panStartRef.current.my),
    });
  };

  const handleCanvasMouseUp = () => {
    isPanningRef.current = false;
    setIsPanning(false);
  };

  const uploadToNode = async (file?: File) => {
    if (!selectedNode || !file) return;

    setUploading(true);
    try {
      const image = await uploadBuilderImage(file);
      updateNodeProps(selectedNode.id, { src: image.url, alt: file.name });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const builder = (
    <>
      <div
        className={cn(
          "flex flex-col overflow-hidden border border-zinc-200 bg-white shadow-2xl",
          presentation === "modal"
            ? "mx-auto h-full max-w-7xl rounded-xl"
            : "h-full w-full rounded-none border-0 shadow-none",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 px-5">
          <div>
            <div className="text-sm font-semibold">Frame Template Builder</div>
            <div className="text-xs text-zinc-500">{templateName}</div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((value) => clampZoom(value - 0.1))}
              title="Zoom out"
            >
              <ZoomOut className="size-4" />
            </Button>
            <button
              className="h-9 w-16 rounded-md text-center text-xs font-mono text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              onClick={fitToScreen}
              title="Fit to screen"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((value) => clampZoom(value + 0.1))}
              title="Zoom in"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Actual size"
            >
              <Maximize2 className="size-4" />
            </Button>
            {selectedId ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => panToNode(selectedId)}
                title="Pan to selection"
              >
                <Crosshair className="size-4" />
              </Button>
            ) : null}
            <div className="mx-2 h-5 w-px bg-zinc-200" />
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={history.past.length === 0}
              title="Undo"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={history.future.length === 0}
              title="Redo"
            >
              <Redo2 className="size-4" />
            </Button>
            <div className="mx-2 h-5 w-px bg-zinc-200" />
            {/* Full view toggle */}
            <Button
              variant="ghost"
              size="icon"
              title={fullView ? "Exit full view" : "Full view"}
              className={cn(
                fullView &&
                  "bg-zinc-900 text-white hover:bg-zinc-700 hover:text-white",
              )}
              onClick={() => setFullView(!fullView)}
            >
              {fullView ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4 opacity-60" />
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(normalizeFrameLayout(layout))}>
              {saveLabel}
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_360px]">
          <aside className="flex min-h-0 flex-col overflow-hidden border-r border-zinc-100">
            <div className="shrink-0 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Add layer
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FRAME_NODE_TYPES.map((item) => (
                  <Button
                    key={item.type}
                    variant="outline"
                    size="sm"
                    onClick={() => addNode(item.type)}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-100">
              <div className="flex shrink-0 items-center justify-between px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Layers
                </div>
                <div className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                  {layers.length}
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
                <DndContext sensors={sensors} onDragEnd={handleLayerDragEnd}>
                  <SortableContext
                    items={layers.map((node) => node.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {layers.map((node) => (
                        <SortableFrameLayer
                          key={node.id}
                          node={node}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                          onToggleLock={(id, locked) =>
                            updateNode(id, { locked })
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </ScrollArea>
            </div>
          </aside>

          <main
            ref={canvasSurfaceRef}
            className="relative min-w-0 overflow-hidden bg-zinc-100"
            style={{
              cursor: isPanning ? "grabbing" : spaceDown ? "grab" : "default",
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
              if (!(event.target as HTMLElement).closest(".frame-rnd-node")) {
                canvasTouchMenu.onPointerDown(event);
              }
            }}
            onPointerMove={canvasTouchMenu.onPointerMove}
            onPointerUp={canvasTouchMenu.onPointerUp}
            onPointerCancel={canvasTouchMenu.onPointerCancel}
            onClickCapture={canvasTouchMenu.onClickCapture}
            onContextMenu={(event) => {
              event.preventDefault();
              setSelectedId(null);
              setContextMenu({
                x: event.clientX,
                y: event.clientY,
                nodeId: null,
              });
            }}
          >
            <div
              ref={canvasViewportRef}
              className="pointer-events-none absolute inset-0"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)",
                backgroundPosition: `${pan.x % (22 * zoom)}px ${pan.y % (22 * zoom)}px`,
                backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="pointer-events-auto relative"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              >
                <div className="absolute -top-7 left-0 select-none whitespace-nowrap text-[11px] font-medium text-zinc-400">
                  Frame template · {layout.canvas.width} ×{" "}
                  {layout.canvas.height}px
                </div>
                <div
                  className="relative overflow-hidden rounded-lg shadow-2xl"
                  style={{
                    width: layout.canvas.width,
                    height: layout.canvas.height,
                    background: layout.canvas.backgroundColor,
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedId(null);
                    setContextMenu({
                      x: event.clientX,
                      y: event.clientY,
                      nodeId: null,
                    });
                  }}
                >
                  {guides.map((guide, index) =>
                    guide.type === "v" ? (
                      <div
                        key={`${guide.type}-${guide.pos}-${index}`}
                        className="pointer-events-none absolute inset-y-0"
                        style={{
                          left: guide.pos,
                          width: 1,
                          background: "#f000a0",
                          zIndex: 9999,
                          opacity: 0.85,
                        }}
                      />
                    ) : (
                      <div
                        key={`${guide.type}-${guide.pos}-${index}`}
                        className="pointer-events-none absolute inset-x-0"
                        style={{
                          top: guide.pos,
                          height: 1,
                          background: "#f000a0",
                          zIndex: 9999,
                          opacity: 0.85,
                        }}
                      />
                    ),
                  )}
                  {snapPreview ? (
                    <div
                      className="pointer-events-none absolute"
                      style={{
                        left: snapPreview.x,
                        top: snapPreview.y,
                        width: snapPreview.w,
                        height: snapPreview.h,
                        border: "2px dashed #f000a0",
                        background: "rgba(240,0,160,0.08)",
                        borderRadius: 4,
                        zIndex: 9998,
                      }}
                    />
                  ) : null}
                  {layout.nodes
                    .slice()
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((node) => (
                      <Rnd
                        key={node.id}
                        bounds="parent"
                        scale={zoom}
                        disableDragging={node.locked}
                        enableResizing={!node.locked}
                        position={{ x: node.x, y: node.y }}
                        size={{ width: node.width, height: node.height }}
                        onClick={(event: React.MouseEvent) => {
                          event.stopPropagation();
                          setSelectedId(node.id);
                        }}
                        onContextMenu={(event: React.MouseEvent) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedId(node.id);
                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            nodeId: node.id,
                          });
                        }}
                        onPointerDown={(
                          event: React.PointerEvent<HTMLDivElement>,
                        ) => {
                          longPressNodeRef.current = node.id;
                          setSelectedId(node.id);
                          nodeTouchMenu.onPointerDown(event);
                        }}
                        onPointerMove={nodeTouchMenu.onPointerMove}
                        onPointerUp={nodeTouchMenu.onPointerUp}
                        onPointerCancel={nodeTouchMenu.onPointerCancel}
                        onClickCapture={nodeTouchMenu.onClickCapture}
                        onDragStart={() => setSelectedId(node.id)}
                        onDrag={(_, data) => {
                          const snapState = computeGuides(node, data.x, data.y);
                          setGuides(snapState.guides);
                          setSnapPreview(
                            snapState.isSnapping
                              ? {
                                  x: snapState.sx,
                                  y: snapState.sy,
                                  w: node.width,
                                  h: node.height,
                                }
                              : null,
                          );
                        }}
                        onDragStop={(_, data) => {
                          const snapState = computeGuides(node, data.x, data.y);
                          updateNode(node.id, {
                            x: snapState.sx,
                            y: snapState.sy,
                          });
                          clearSnap();
                        }}
                        onResize={(_, __, ref, ___, position) => {
                          const snapState = computeGuides(
                            node,
                            position.x,
                            position.y,
                            ref.offsetWidth,
                            ref.offsetHeight,
                          );
                          setGuides(snapState.guides);
                          setSnapPreview(
                            snapState.isSnapping
                              ? {
                                  x: snapState.sx,
                                  y: snapState.sy,
                                  w: snapState.w,
                                  h: snapState.h,
                                }
                              : null,
                          );
                        }}
                        onResizeStart={() => setSelectedId(node.id)}
                        onResizeStop={(_, __, ref, ___, position) => {
                          const snapState = computeGuides(
                            node,
                            position.x,
                            position.y,
                            ref.offsetWidth,
                            ref.offsetHeight,
                          );
                          updateNode(node.id, {
                            width: snapState.w,
                            height: snapState.h,
                            x: snapState.sx,
                            y: snapState.sy,
                          });
                          clearSnap();
                        }}
                        style={{
                          zIndex: node.zIndex,
                          opacity: node.opacity,
                          transform: `rotate(${node.rotation}deg)`,
                        }}
                        className={cn(
                          "frame-rnd-node group touch-none",
                          selectedId === node.id &&
                            "outline outline-2 outline-offset-2 outline-zinc-950",
                          node.locked && "cursor-not-allowed",
                          node.id === "frame-background" &&
                            selectedId !== node.id &&
                            "pointer-events-none",
                        )}
                      >
                        <FrameNodeRenderer node={node} />
                      </Rnd>
                    ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[10px] text-zinc-400 shadow-sm backdrop-blur-sm">
              Ctrl+scroll to zoom · Scroll to pan · Space+drag to pan · Shift+1
              Fit · Shift+2 100% · F Pan to selection
            </div>
          </main>

          <aside className="min-h-0 overflow-hidden border-l border-zinc-100">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {detailsPanel}
                <section className="space-y-3 rounded-lg border border-zinc-200 p-3">
                  <div className="text-sm font-semibold">Canvas</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-zinc-500">
                      Width (px)
                      <Input
                        className="mt-1"
                        type="number"
                        min={1}
                        max={10000}
                        value={layout.canvas.width}
                        onChange={(event) =>
                          updateCanvas({ width: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-500">
                      Height (px)
                      <Input
                        className="mt-1"
                        type="number"
                        min={1}
                        max={10000}
                        value={layout.canvas.height}
                        onChange={(event) =>
                          updateCanvas({ height: Number(event.target.value) })
                        }
                      />
                    </label>
                  </div>
                  <label className="text-xs font-medium text-zinc-500">
                    Background
                    <div className="mt-1 grid grid-cols-[42px_1fr] gap-2">
                      <Input
                        className="h-9 p-1"
                        type="color"
                        value={layout.canvas.backgroundColor}
                        onChange={(event) =>
                          updateCanvas({ backgroundColor: event.target.value })
                        }
                      />
                      <Input
                        value={layout.canvas.backgroundColor}
                        onChange={(event) =>
                          updateCanvas({ backgroundColor: event.target.value })
                        }
                      />
                    </div>
                  </label>
                </section>

                {selectedNode ? (
                  <section className="space-y-3 rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          {selectedNode.type}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {selectedNode.id}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={selectedNode.id === "frame-background"}
                          onClick={() => duplicateNode(selectedNode)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateNode(selectedNode.id, {
                              locked: !selectedNode.locked,
                            })
                          }
                        >
                          {selectedNode.locked ? (
                            <Unlock className="size-4" />
                          ) : (
                            <Lock className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={selectedNode.id === "frame-background"}
                          onClick={() => {
                            deleteNode(selectedNode);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(["x", "y", "width", "height"] as const).map((key) => (
                        <label
                          key={key}
                          className="text-xs font-medium text-zinc-500"
                        >
                          {key.toUpperCase()}
                          <Input
                            className="mt-1"
                            type="number"
                            value={Math.round(selectedNode[key])}
                            onChange={(event) =>
                              updateNode(selectedNode.id, {
                                [key]: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>

                    <label className="block text-xs font-medium text-zinc-500">
                      Opacity
                      <Slider
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={selectedNode.opacity}
                        onChange={(event) =>
                          updateNode(selectedNode.id, {
                            opacity: Number(event.target.value),
                          })
                        }
                      />
                    </label>

                    <label className="block text-xs font-medium text-zinc-500">
                      Rotation
                      <Input
                        className="mt-1"
                        type="number"
                        value={selectedNode.rotation}
                        onChange={(event) =>
                          updateNode(selectedNode.id, {
                            rotation: Number(event.target.value),
                          })
                        }
                      />
                    </label>

                    {selectedNode.type === "text" ||
                    selectedNode.type === "date-stamp" ? (
                      <>
                        <label className="block text-xs font-medium text-zinc-500">
                          Text
                          <Input
                            className="mt-1"
                            value={readString(selectedNode.props.content, "")}
                            onChange={(event) =>
                              updateNodeProps(selectedNode.id, {
                                content: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs font-medium text-zinc-500">
                            Font size
                            <Input
                              className="mt-1"
                              type="number"
                              value={readNumber(
                                selectedNode.props.fontSize,
                                18,
                              )}
                              onChange={(event) =>
                                updateNodeProps(selectedNode.id, {
                                  fontSize: Number(event.target.value),
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
                                600,
                              )}
                              onChange={(event) =>
                                updateNodeProps(selectedNode.id, {
                                  fontWeight: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                        <label className="block text-xs font-medium text-zinc-500">
                          Color
                          <div className="mt-1 grid grid-cols-[42px_1fr] gap-2">
                            <Input
                              className="h-9 p-1"
                              type="color"
                              value={readString(
                                selectedNode.props.color,
                                "#18181b",
                              )}
                              onChange={(event) =>
                                updateNodeProps(selectedNode.id, {
                                  color: event.target.value,
                                })
                              }
                            />
                            <Input
                              value={readString(
                                selectedNode.props.color,
                                "#18181b",
                              )}
                              onChange={(event) =>
                                updateNodeProps(selectedNode.id, {
                                  color: event.target.value,
                                })
                              }
                            />
                          </div>
                        </label>
                      </>
                    ) : null}

                    {selectedNode.type === "image" ||
                    selectedNode.type === "background" ? (
                      <>
                        <label className="block text-xs font-medium text-zinc-500">
                          Image URL
                          <Input
                            className="mt-1"
                            value={readString(selectedNode.props.src, "")}
                            onChange={(event) =>
                              updateNodeProps(selectedNode.id, {
                                src: event.target.value,
                              })
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
                            onChange={(event) =>
                              uploadToNode(event.target.files?.[0])
                            }
                          />
                        </label>
                        <label className="block text-xs font-medium text-zinc-500">
                          Fit
                          <Select
                            className="mt-1"
                            value={readString(
                              selectedNode.props.objectFit,
                              "cover",
                            )}
                            onChange={(event) =>
                              updateNodeProps(selectedNode.id, {
                                objectFit: event.target.value,
                              })
                            }
                          >
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                          </Select>
                        </label>
                      </>
                    ) : null}

                    {selectedNode.type === "photo-slot" ||
                    selectedNode.type === "border" ? (
                      <>
                        <label className="block text-xs font-medium text-zinc-500">
                          Border color
                          <Input
                            className="mt-1"
                            value={readString(
                              selectedNode.props.borderColor,
                              "#d4d4d8",
                            )}
                            onChange={(event) =>
                              updateNodeProps(selectedNode.id, {
                                borderColor: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs font-medium text-zinc-500">
                            Radius
                            <Input
                              className="mt-1"
                              type="number"
                              value={readNumber(selectedNode.props.radius, 10)}
                              onChange={(event) =>
                                updateNodeProps(selectedNode.id, {
                                  radius: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-zinc-500">
                            Border
                            <Input
                              className="mt-1"
                              type="number"
                              value={readNumber(
                                selectedNode.props.borderWidth,
                                selectedNode.type === "border" ? 2 : 0,
                              )}
                              onChange={(event) =>
                                updateNodeProps(selectedNode.id, {
                                  borderWidth: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                      </>
                    ) : null}
                  </section>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                    Select a layer to edit its size, position, media, text, and
                    frame styling.
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </div>
      {contextMenu ? (
        <FrameContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextNode}
          hasClipboard={!!clipboard}
          onClose={() => setContextMenu(null)}
          onCopy={() =>
            contextNode &&
            runContextAction(() => setClipboard({ ...contextNode }))
          }
          onCut={() => {
            if (
              !contextNode ||
              contextNode.locked ||
              contextNode.id === "frame-background"
            )
              return;
            setClipboard({ ...contextNode });
            runContextAction(() => {
              commitLayout((c) => ({
                ...c,
                nodes: normalizePhotoSlotLabels(
                  c.nodes.filter((n) => n.id !== contextNode.id),
                ),
              }));
              setSelectedId(null);
            });
          }}
          onPaste={() => {
            if (!clipboard) return;
            const clone: FrameNode = {
              ...clipboard,
              id: `${clipboard.id}-paste-${Date.now()}`,
              x: clipboard.x + 18,
              y: clipboard.y + 18,
              locked: false,
              zIndex: Math.max(0, ...layout.nodes.map((n) => n.zIndex)) + 1,
            };
            runContextAction(() => {
              commitLayout((c) => ({
                ...c,
                nodes: normalizePhotoSlotLabels([...c.nodes, clone]),
              }));
              setSelectedId(clone.id);
            });
          }}
          onDuplicate={() =>
            contextNode && runContextAction(() => duplicateNode(contextNode))
          }
          onBringToFront={() =>
            contextNode && runContextAction(() => bringNodeToFront(contextNode))
          }
          onBringForward={() =>
            contextNode &&
            runContextAction(() => moveLayer(contextNode.id, "up"))
          }
          onSendBackward={() =>
            contextNode &&
            runContextAction(() => moveLayer(contextNode.id, "down"))
          }
          onSendToBack={() =>
            contextNode && runContextAction(() => sendNodeToBack(contextNode))
          }
          onToggleLock={() =>
            contextNode &&
            runContextAction(() =>
              updateNode(contextNode.id, { locked: !contextNode.locked }),
            )
          }
          onDelete={() =>
            contextNode && runContextAction(() => deleteNode(contextNode))
          }
          onAddNode={(type) => runContextAction(() => addNode(type))}
        />
      ) : null}
    </>
  );

  if (presentation === "embedded") {
    return builder;
  }

  return (
    <div className="fixed inset-0 z-[70] bg-zinc-950/40 p-4 backdrop-blur-sm">
      {builder}
    </div>
  );
}
