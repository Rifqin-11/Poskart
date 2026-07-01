"use client";

import {
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
} from "@dnd-kit/sortable";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { BuilderHeader } from "@/features/builder/shared/builder-header";
import { BuilderUnsavedDialog } from "@/features/builder/shared/builder-unsaved-dialog";
import { BuilderZoomControls } from "@/features/builder/shared/builder-zoom-controls";
import { useBuilderExitGuard } from "@/features/builder/shared/use-builder-exit-guard";
import { FRAME_SNAP_THRESHOLD } from "@/features/admin/templates/frame-builder.constants";
import { FrameCanvasStage } from "@/features/admin/templates/components/frame-canvas-stage";
import { FrameContextMenu } from "@/features/admin/templates/components/frame-context-menu";
import { FrameLayerSidebar } from "@/features/admin/templates/components/frame-layer-sidebar";
import { FramePropertiesPanel } from "@/features/admin/templates/components/frame-properties-panel";
import {
  clampNumber,
  clampZoom,
  createDefaultFrameLayout,
  createNode,
  getRotatedVisualInset,
  normalizeFrameLayout,
  normalizePhotoSlotLabels,
  resizeFrameLayout,
  upsertFrameBackground,
} from "@/features/admin/templates/frame-builder.utils";
import { useTouchContextMenu } from "@/lib/hooks/use-touch-context-menu";
import { uploadBuilderImage } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import {
  type FrameLayout,
  type FrameNode,
  type FrameNodeType,
} from "@/types/frame-template";





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
  onSave: (layout: FrameLayout) => void | Promise<void>;
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
    rotation: number;
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
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const hydratedKeyRef = useRef<string | null>(null);
  const [committedLayoutKey, setCommittedLayoutKey] = useState(() =>
    JSON.stringify(normalizeFrameLayout(initialLayout ?? fallbackLayout)),
  );
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
  const currentLayoutKey = JSON.stringify(normalizeFrameLayout(layout));
  const hasUnsavedChanges = committedLayoutKey !== currentLayoutKey;
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

  const saveCurrentLayout = useCallback(async () => {
    const normalizedLayout = normalizeFrameLayout(layout);
    setIsSavingLayout(true);
    try {
      await onSave(normalizedLayout);
      setCommittedLayoutKey(JSON.stringify(normalizedLayout));
      return true;
    } catch {
      return false;
    } finally {
      setIsSavingLayout(false);
    }
  }, [layout, onSave]);

  const saveFrameAndClose = useCallback(async () => {
    const saved = await saveCurrentLayout();
    if (!saved) throw new Error("Save failed");
    onClose();
  }, [onClose, saveCurrentLayout]);

  const {
    showUnsavedDialog,
    requestLeave: requestClose,
    cancelLeave: cancelUnsavedLeave,
    discardAndLeave,
    saveAndLeave,
  } = useBuilderExitGuard({
    hasUnsavedChanges,
    onLeave: onClose,
    onSaveAndLeave: saveFrameAndClose,
  });

  useEffect(() => {
    if (!open) return;
    if (hydratedKeyRef.current === resetKey) return;
    hydratedKeyRef.current = resetKey;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const nextLayout = normalizeFrameLayout(initialLayout ?? fallbackLayout);
      setCommittedLayoutKey(JSON.stringify(nextLayout));
      setLayout(nextLayout);
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
    frameImageDimensions,
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
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
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
        if (selectedId) {
          panToNode(selectedId);
        } else {
          fitToScreen();
        }
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
    const visualInset = getRotatedVisualInset(width, height, node.rotation);
    const minX = -visualInset.x;
    const maxX = layout.canvas.width - width + visualInset.x;
    const minY = -visualInset.y;
    const maxY = layout.canvas.height - height + visualInset.y;
    const clampedX = clampNumber(rawX, minX, maxX);
    const clampedY = clampNumber(rawY, minY, maxY);
    const nextGuides: Array<{ type: "h" | "v"; pos: number }> = [];
    const nodeCenterX = clampedX + width / 2;
    const nodeCenterY = clampedY + height / 2;
    const canvasCenterX = layout.canvas.width / 2;
    const canvasCenterY = layout.canvas.height / 2;

    if (Math.abs(nodeCenterX - canvasCenterX) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "v", pos: canvasCenterX });
    }
    if (Math.abs(nodeCenterY - canvasCenterY) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "h", pos: canvasCenterY });
    }
    if (Math.abs(clampedX + visualInset.x) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "v", pos: 0 });
    }
    if (
      Math.abs(clampedX + width - visualInset.x - layout.canvas.width) <
      FRAME_SNAP_THRESHOLD
    ) {
      nextGuides.push({ type: "v", pos: layout.canvas.width });
    }
    if (Math.abs(clampedY + visualInset.y) < FRAME_SNAP_THRESHOLD) {
      nextGuides.push({ type: "h", pos: 0 });
    }
    if (
      Math.abs(clampedY + height - visualInset.y - layout.canvas.height) <
      FRAME_SNAP_THRESHOLD
    ) {
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
        if (Math.abs(clampedX - other.x) < FRAME_SNAP_THRESHOLD) {
          nextGuides.push({ type: "v", pos: other.x });
        }
        if (
          Math.abs(clampedX + width - (other.x + other.width)) <
          FRAME_SNAP_THRESHOLD
        ) {
          nextGuides.push({ type: "v", pos: other.x + other.width });
        }
        if (Math.abs(clampedY - other.y) < FRAME_SNAP_THRESHOLD) {
          nextGuides.push({ type: "h", pos: other.y });
        }
        if (
          Math.abs(clampedY + height - (other.y + other.height)) <
          FRAME_SNAP_THRESHOLD
        ) {
          nextGuides.push({ type: "h", pos: other.y + other.height });
        }
      });

    return {
      guides: nextGuides,
      sx: clampedX,
      sy: clampedY,
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
        <BuilderHeader
          title="Frame Template Builder"
          subtitle={templateName}
          onBack={requestClose}
          saveLabel={saveLabel}
          isSaving={isSavingLayout}
          onSave={() => void saveCurrentLayout()}
          onUndo={undo}
          onRedo={redo}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          centerContent={
            <BuilderZoomControls
              zoom={zoom}
              hasSelection={!!selectedId}
              onZoomOut={() => setZoom((value) => clampZoom(value - 0.1))}
              onZoomIn={() => setZoom((value) => clampZoom(value + 0.1))}
              onFitToScreen={fitToScreen}
              onPanToSelection={
                selectedId ? () => panToNode(selectedId) : undefined
              }
            />
          }
        />

        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_360px]">
          <FrameLayerSidebar
            layers={layers}
            selectedId={selectedId}
            sensors={sensors}
            onAddNode={addNode}
            onLayerDragEnd={handleLayerDragEnd}
            onSelectNode={setSelectedId}
            onToggleLock={(id, locked) => updateNode(id, { locked })}
          />

          <FrameCanvasStage
            canvasSurfaceRef={canvasSurfaceRef}
            canvasViewportRef={canvasViewportRef}
            layout={layout}
            zoom={zoom}
            pan={pan}
            guides={guides}
            snapPreview={snapPreview}
            selectedId={selectedId}
            isPanning={isPanning}
            spaceDown={spaceDown}
            canvasTouchMenu={canvasTouchMenu}
            nodeTouchMenu={nodeTouchMenu}
            onCanvasMouseDown={handleCanvasMouseDown}
            onCanvasMouseMove={handleCanvasMouseMove}
            onCanvasMouseUp={handleCanvasMouseUp}
            onSelectNode={setSelectedId}
            onOpenContextMenu={(x, y, nodeId) =>
              setContextMenu({ x, y, nodeId })
            }
            onComputeGuides={computeGuides}
            onUpdateNode={updateNode}
            onClearSnap={clearSnap}
            onSetGuides={setGuides}
            onSetSnapPreview={setSnapPreview}
            onSetLongPressNode={(id) => {
              longPressNodeRef.current = id;
            }}
          />

          <FramePropertiesPanel
            detailsPanel={detailsPanel}
            layout={layout}
            selectedNode={selectedNode}
            uploading={uploading}
            onUpdateCanvas={updateCanvas}
            onUpdateNode={updateNode}
            onUpdateNodeProps={updateNodeProps}
            onDuplicateNode={duplicateNode}
            onDeleteNode={deleteNode}
            onUploadToNode={uploadToNode}
          />
        </div>
      </div>
      <BuilderUnsavedDialog
        open={showUnsavedDialog}
        description="Ada perubahan di frame builder yang belum tersimpan. Kamu bisa tetap di builder, membuang perubahan, atau menyimpan dulu sebelum kembali."
        isSaving={isSavingLayout}
        onCancel={cancelUnsavedLeave}
        onDiscard={discardAndLeave}
        onSave={() => void saveAndLeave()}
      />
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
