"use client";

import {
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "@/lib/toast";
import { BuilderHeader } from "@/features/builder/shared/builder-header";
import { BuilderResponsiveWorkspace } from "@/features/builder/shared/builder-responsive-workspace";
import { BuilderUnsavedDialog } from "@/features/builder/shared/builder-unsaved-dialog";
import { BuilderZoomControls } from "@/features/builder/shared/builder-zoom-controls";
import { useBuilderCanvasNavigation } from "@/features/builder/shared/use-builder-canvas-navigation";
import { useBuilderExitGuard } from "@/features/builder/shared/use-builder-exit-guard";
import { useBuilderResponsiveMode } from "@/features/builder/shared/use-builder-responsive-mode";
import { FRAME_SNAP_THRESHOLD } from "@/features/admin/templates/frame-builder.constants";
import { FrameCanvasStage } from "@/features/admin/templates/components/frame-canvas-stage";
import { FrameContextMenu } from "@/features/admin/templates/components/frame-context-menu";
import { FrameLayerSidebar } from "@/features/admin/templates/components/frame-layer-sidebar";
import {
  PhotoSlotDetectorDialog,
  type PhotoSlotDetectionApplication,
} from "@/features/admin/templates/components/photo-slot-detector-dialog";
import { FramePropertiesPanel } from "@/features/admin/templates/components/frame-properties-panel";
import {
  clampNumber,
  clampZoom,
  createDefaultFrameLayout,
  createNode,
  getRotatedVisualInset,
  normalizeFrameLayout,
  normalizePhotoSlotLabels,
  readNumber,
  readString,
  resizeFrameLayout,
  upsertFrameBackground,
} from "@/features/admin/templates/frame-builder.utils";
import { useTouchContextMenu } from "@/lib/hooks/use-touch-context-menu";
import {
  countUsableFramePhotoSlots,
  FRAME_PHOTO_SLOT_REQUIRED_MESSAGE,
} from "@/lib/builder/frame-layout-validation";
import {
  getBuilderImageValidationError,
  uploadBuilderImage,
} from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import type { MusicEmbed } from "@/lib/music/embed";
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
  const [photoSlotDetectorOpen, setPhotoSlotDetectorOpen] = useState(false);
  const { isPortraitBuilder } = useBuilderResponsiveMode();
  const hydratedKeyRef = useRef<string | null>(null);
  const [committedLayoutKey, setCommittedLayoutKey] = useState(() =>
    JSON.stringify(normalizeFrameLayout(initialLayout ?? fallbackLayout)),
  );
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const spaceRef = useRef(false);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement>(null);
  const longPressNodeRef = useRef<string | null>(null);
  const selectedNode = layout.nodes.find((node) => node.id === selectedId);
  const frameBackgroundNode = layout.nodes.find(
    (node) => node.id === "frame-background",
  );
  const frameBackgroundSource = readString(frameBackgroundNode?.props.src, "");
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

  useBuilderCanvasNavigation({
    surfaceRef: canvasSurfaceRef,
    surfaceKey: isPortraitBuilder,
    enabled: open,
    nodeSelector: ".frame-rnd-node",
    zoom,
    pan,
    setZoom,
    setPan,
    clampZoom,
  });
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
    if (countUsableFramePhotoSlots(normalizedLayout) < 1) {
      toast.error("Frame belum dapat disimpan", {
        description: FRAME_PHOTO_SLOT_REQUIRED_MESSAGE,
        duration: 10_000,
      });
      return false;
    }

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
    const timer = window.setTimeout(() => fitToScreen(), 50);
    const viewport = canvasViewportRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => fitToScreen())
        : null;

    if (viewport) resizeObserver?.observe(viewport);
    window.addEventListener("resize", fitToScreen);

    return () => {
      window.clearTimeout(timer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", fitToScreen);
    };
  }, [fitToScreen, isPortraitBuilder, open, resetKey]);

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

  const updateMusic = (music: MusicEmbed | null) =>
    commitLayout((current) => ({ ...current, music }));

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

  const assignPhotoSlotOrder = (id: string, order: number) =>
    commitLayout((current) => {
      const photoSlots = current.nodes.filter(
        (node) => node.type === "photo-slot",
      );
      const selectedSlot = photoSlots.find((node) => node.id === id);
      if (!selectedSlot) return current;

      const clampedOrder = clampNumber(
        Math.round(order),
        1,
        Math.max(1, photoSlots.length),
      );
      const orderedSlots = [...photoSlots].sort((a, b) => {
        const orderA = readNumber(
          a.props.photoOrder,
          photoSlots.indexOf(a) + 1,
        );
        const orderB = readNumber(
          b.props.photoOrder,
          photoSlots.indexOf(b) + 1,
        );
        if (orderA !== orderB) return orderA - orderB;
        return photoSlots.indexOf(a) - photoSlots.indexOf(b);
      });
      const withoutSelected = orderedSlots.filter((node) => node.id !== id);
      withoutSelected.splice(clampedOrder - 1, 0, selectedSlot);
      const orderById = new Map(
        withoutSelected.map((node, index) => [node.id, index + 1]),
      );

      return {
        ...current,
        nodes: normalizePhotoSlotLabels(
          current.nodes.map((node) =>
            node.type === "photo-slot"
              ? {
                  ...node,
                  props: {
                    ...node.props,
                    photoOrder: orderById.get(node.id) ?? 1,
                  },
                }
              : node,
          ),
        ),
      };
    });

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

  const uploadToNode = async (file: File) => {
    if (!selectedNode) return;
    const validationError = getBuilderImageValidationError(file);
    if (validationError) throw new Error(validationError);

    setUploading(true);
    try {
      const image = await uploadBuilderImage(file);
      updateNodeProps(selectedNode.id, { src: image.url, alt: file.name });
      toast.success("Image uploaded");
    } finally {
      setUploading(false);
    }
  };

  const applyDetectedPhotoSlots = ({
    candidates,
    detection,
    replaceExisting,
    sensitivity,
  }: PhotoSlotDetectionApplication) => {
    const createdAt = Date.now();
    const createdIds = candidates.map(
      (_, index) => `photo-slot-detected-${createdAt}-${index + 1}`,
    );

    commitLayout((current) => {
      const existingSlots = current.nodes.filter(
        (node) => node.type === "photo-slot",
      );
      const retainedNodes = replaceExisting
        ? current.nodes.filter((node) => node.type !== "photo-slot")
        : current.nodes;
      const background = retainedNodes.find(
        (node) => node.id === "frame-background",
      );
      const insertionZIndex = existingSlots.length
        ? Math.min(...existingSlots.map((node) => node.zIndex))
        : (background?.zIndex ?? 0) + 1;
      const nodesWithSpace = retainedNodes.map((node) =>
        node.id !== "frame-background" && node.zIndex >= insertionZIndex
          ? { ...node, zIndex: node.zIndex + candidates.length }
          : node,
      );
      const existingPhotoCount = replaceExisting ? 0 : existingSlots.length;
      const detectedNodes: FrameNode[] = candidates.map((candidate, index) => ({
        id: createdIds[index],
        type: "photo-slot",
        x: Math.round(candidate.x * current.canvas.width),
        y: Math.round(candidate.y * current.canvas.height),
        width: Math.max(1, Math.round(candidate.width * current.canvas.width)),
        height: Math.max(
          1,
          Math.round(candidate.height * current.canvas.height),
        ),
        rotation: 0,
        opacity: 1,
        zIndex: insertionZIndex + index,
        locked: false,
        props: {
          label: `Photo ${existingPhotoCount + index + 1}`,
          photoOrder: existingPhotoCount + index + 1,
          background: "#f4f4f5",
          borderColor: "transparent",
          borderWidth: 0,
          radius: 0,
          autoDetected: true,
        },
      }));
      const regionPadding = 0.002;
      const regions = candidates.map((candidate) => ({
        x: Math.max(0, candidate.x - regionPadding),
        y: Math.max(0, candidate.y - regionPadding),
        width: Math.min(
          1 - Math.max(0, candidate.x - regionPadding),
          candidate.width + regionPadding * 2,
        ),
        height: Math.min(
          1 - Math.max(0, candidate.y - regionPadding),
          candidate.height + regionPadding * 2,
        ),
      }));
      const tolerance = Math.round(28 + sensitivity * 0.42);

      return {
        ...current,
        nodes: normalizePhotoSlotLabels(
          [...nodesWithSpace, ...detectedNodes].map((node) =>
            node.id === "frame-background"
              ? {
                  ...node,
                  props: {
                    ...node.props,
                    colorKey: {
                      enabled: true,
                      color: detection.markerColor,
                      tolerance,
                      softness: 8,
                      smoothness: 1,
                      regions,
                    },
                  },
                }
              : node,
          ),
        ),
      };
    });

    setSelectedId(createdIds[0] ?? null);
    toast.success(`${candidates.length} photo slot berhasil dibuat.`);
  };

  const builder = (
    <>
      <div
        className={cn(
          "flex flex-col overflow-hidden border border-zinc-200 bg-white shadow-2xl",
          presentation === "modal" && !isPortraitBuilder
            ? "mx-auto h-full max-w-7xl rounded-xl"
            : "h-full w-full rounded-none border-0 shadow-none",
        )}
      >
        <BuilderHeader
          compact={isPortraitBuilder}
          title={`Frame: ${templateName}`}
          onBack={requestClose}
          saveLabel={saveLabel}
          isSaving={isSavingLayout}
          onSave={() => void saveCurrentLayout()}
          onUndo={undo}
          onRedo={redo}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          centerContent={
            !isPortraitBuilder ? (
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
            ) : undefined
          }
        />

        <BuilderResponsiveWorkspace
          key={isPortraitBuilder ? "portrait" : "desktop"}
          isPortraitBuilder={isPortraitBuilder}
          desktopClassName="flex"
          layersCount={layers.length}
          activeContextLabel="frame"
          selectedPropertiesLabel={
            selectedNode?.type.replaceAll("-", " ") ?? null
          }
          desktopLayers={
            <FrameLayerSidebar
              layers={layers}
              selectedId={selectedId}
              sensors={sensors}
              onAddNode={addNode}
              onLayerDragEnd={handleLayerDragEnd}
              onSelectNode={setSelectedId}
              onToggleLock={(id, locked) => updateNode(id, { locked })}
            />
          }
          desktopProperties={
            <FramePropertiesPanel
              key={selectedId ?? "frame-canvas"}
              detailsPanel={detailsPanel}
              layout={layout}
              selectedNode={selectedNode}
              uploading={uploading}
              onUpdateCanvas={updateCanvas}
              onUpdateMusic={updateMusic}
              onUpdateNode={updateNode}
              onUpdateNodeProps={updateNodeProps}
              onAssignPhotoSlotOrder={assignPhotoSlotOrder}
              onDuplicateNode={duplicateNode}
              onDeleteNode={deleteNode}
              onUploadToNode={uploadToNode}
              onDetectPhotoSlots={() => setPhotoSlotDetectorOpen(true)}
            />
          }
          canvas={
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
              showInteractionHint={!isPortraitBuilder}
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
          }
          zoomControls={
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
          layersContent={
            <FrameLayerSidebar
              embedded
              mode="layers"
              layers={layers}
              selectedId={selectedId}
              sensors={sensors}
              onAddNode={addNode}
              onLayerDragEnd={handleLayerDragEnd}
              onSelectNode={setSelectedId}
              onToggleLock={(id, locked) => updateNode(id, { locked })}
            />
          }
          renderAddContent={(closePanel) => (
            <FrameLayerSidebar
              embedded
              mode="add"
              layers={layers}
              selectedId={selectedId}
              sensors={sensors}
              onAddNode={(type) => {
                addNode(type);
                closePanel();
              }}
              onLayerDragEnd={handleLayerDragEnd}
              onSelectNode={setSelectedId}
              onToggleLock={(id, locked) => updateNode(id, { locked })}
            />
          )}
          propertiesContent={
            <FramePropertiesPanel
              key={selectedId ?? "frame-canvas"}
              embedded
              detailsPanel={detailsPanel}
              layout={layout}
              selectedNode={selectedNode}
              uploading={uploading}
              onUpdateCanvas={updateCanvas}
              onUpdateMusic={updateMusic}
              onUpdateNode={updateNode}
              onUpdateNodeProps={updateNodeProps}
              onAssignPhotoSlotOrder={assignPhotoSlotOrder}
              onDuplicateNode={duplicateNode}
              onDeleteNode={deleteNode}
              onUploadToNode={uploadToNode}
              onDetectPhotoSlots={() => setPhotoSlotDetectorOpen(true)}
            />
          }
        />
      </div>
      <BuilderUnsavedDialog
        open={showUnsavedDialog}
        description="Ada perubahan di frame builder yang belum tersimpan. Kamu bisa tetap di builder, membuang perubahan, atau menyimpan dulu sebelum kembali."
        isSaving={isSavingLayout}
        onCancel={cancelUnsavedLeave}
        onDiscard={discardAndLeave}
        onSave={() => void saveAndLeave()}
      />
      <PhotoSlotDetectorDialog
        open={photoSlotDetectorOpen}
        imageSource={frameBackgroundSource}
        existingSlotCount={
          layout.nodes.filter((node) => node.type === "photo-slot").length
        }
        onOpenChange={setPhotoSlotDetectorOpen}
        onApply={applyDetectedPhotoSlots}
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
    <div
      className={cn(
        "fixed inset-0 z-[70] bg-zinc-950/40 backdrop-blur-sm",
        isPortraitBuilder ? "p-0" : "p-4",
      )}
    >
      {builder}
    </div>
  );
}
