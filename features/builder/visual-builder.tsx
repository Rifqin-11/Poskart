"use client";

import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  AlignCenter,
  FolderOpen,
  Plus,
  RotateCw,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTouchContextMenu } from "@/lib/hooks/use-touch-context-menu";
import {
  useActiveLayoutSchema,
  useLayoutSchemas,
  useSaveLayoutAsTheme,
} from "@/features/admin/layout/use-layout";
import {
  COMPONENT_META,
  PAGE_COMPONENTS,
  pageLabels,
} from "@/features/builder/constants";
import {
  isEditableTextNode,
  readString,
  snap,
} from "@/features/builder/utils";
import {
  autoSaveSchema,
  deleteDraft,
  getDrafts,
  getAutoSave,
  relativeTime,
  type LocalDraft,
} from "@/lib/services/draft-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import { BuilderHeader } from "@/features/builder/shared/builder-header";
import { BuilderToolbarButton } from "@/features/builder/shared/builder-toolbar-button";
import { BuilderUnsavedDialog } from "@/features/builder/shared/builder-unsaved-dialog";
import { BuilderZoomControls } from "@/features/builder/shared/builder-zoom-controls";
import { useBuilderExitGuard } from "@/features/builder/shared/use-builder-exit-guard";
import { CanvasControls } from "@/features/builder/components/visual-canvas-controls";
import { VisualContextMenu } from "@/features/builder/components/visual-context-menu";
import { SortableLayer } from "@/features/builder/components/visual-layer-list";
import { NodeRenderer } from "@/features/builder/components/visual-node-renderer";
import { PropertiesPanel } from "@/features/builder/components/visual-properties-panel";
import type {
  BuilderNode,
} from "@/types/builder";



export function VisualBuilder() {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );
  const activePage = useBuilderStore((state) => state.activePage);
  const setActivePage = useBuilderStore((state) => state.setActivePage);
  const selectedId = useBuilderStore((state) => state.selectedId);
  const selectedIds = useBuilderStore((state) => state.selectedIds);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const selectNodes = useBuilderStore((state) => state.selectNodes);
  const deleteSelected = useBuilderStore((state) => state.deleteSelected);
  const canvas = useBuilderStore((state) => state.canvas);
  const isOverlayMode = !!canvas.overlayMode;
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
  const schema = useBuilderStore((state) => state.schema);
  const setSchema = useBuilderStore((state) => state.setSchema);
  const fullView = useBuilderStore((s) => s.builderFullView);
  const setFullView = useBuilderStore((s) => s.setBuilderFullView);
  const clipboard = useBuilderStore((state) => state.clipboard);
  const copyNode = useBuilderStore((state) => state.copyNode);
  const cutNode = useBuilderStore((state) => state.cutNode);
  const pasteNode = useBuilderStore((state) => state.pasteNode);
  const bringForward = useBuilderStore((state) => state.bringForward);
  const sendBackward = useBuilderStore((state) => state.sendBackward);
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
  const longPressNodeRef = useRef<string | null>(null);
  const canvasTouchMenu = useTouchContextMenu(({ x, y }) => {
    selectNode(null);
    setContextMenu({ x, y, nodeId: null });
  });
  const nodeTouchMenu = useTouchContextMenu(({ x, y }) => {
    if (longPressNodeRef.current) {
      setContextMenu({ x, y, nodeId: longPressNodeRef.current });
    }
  });

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
  const lastCommittedSchemaRef = useRef<string | null>(null);
  const pendingLeaveAfterSaveRef = useRef(false);
  const currentSchemaKey = JSON.stringify(schema());
  const hasUnsavedChanges =
    lastCommittedSchemaRef.current !== null &&
    lastCommittedSchemaRef.current !== currentSchemaKey;

  // Re-inject custom font <link> tags whenever canvas.customFonts changes
  useEffect(() => {
    if (lastCommittedSchemaRef.current === null) {
      lastCommittedSchemaRef.current = currentSchemaKey;
    }
  }, [currentSchemaKey]);

  const leaveBuilder = useCallback(() => {
    router.push("/themes");
  }, [router]);

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
        lastCommittedSchemaRef.current = JSON.stringify(schema());
        toast.success(`“${currentThemeName}” saved!`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
        return false;
      } finally {
        setIsSaving(false);
      }
    } else {
      // No current theme — open dialog to name + create
      setThemeName("");
      setShowSaveDialog(true);
      return false;
    }
  }

  function handleLoadSchema(
    s: import("@/types/builder").LayoutSchema,
    opts?: { themeId?: string; themeName?: string },
  ) {
    setSchema(s);
    setCurrentThemeId(opts?.themeId ?? null);
    setCurrentThemeName(opts?.themeName ?? null);
    lastCommittedSchemaRef.current = opts?.themeId
      ? JSON.stringify(s)
      : "__local_draft_requires_save__";
    setShowLoadDialog(false);
    toast.success(
      opts?.themeId ? `Loaded “${opts.themeName ?? "theme"}”` : "Draft loaded!",
    );
  }

  function handleDeleteLocalDraft(id: string) {
    deleteDraft(id);
    setLocalDrafts(getDrafts());
  }

  async function handleSaveAndLeave() {
    if (!currentThemeId || !currentThemeName) {
      pendingLeaveAfterSaveRef.current = true;
      await handleSave();
      return;
    }

    const saved = await handleSave();
    if (saved) leaveBuilder();
  }

  function handleDiscardAndLeave() {
    pendingLeaveAfterSaveRef.current = false;
    leaveBuilder();
  }

  const {
    showUnsavedDialog,
    requestLeave: requestBack,
    cancelLeave: cancelUnsavedLeave,
    saveAndLeave,
  } = useBuilderExitGuard({
    hasUnsavedChanges,
    onLeave: handleDiscardAndLeave,
    onSaveAndLeave: handleSaveAndLeave,
  });
  // ── end Auto-save & Load ─────────────────────────────

  // ── Full-view mode ────────────────────────────────────────
  // Builder pages should open as a focused full-screen workspace.
  // Reset full-view when leaving the builder page.
  useEffect(
    () => {
      setFullView(true);
      return () => {
        setFullView(false);
      };
    },
    [setFullView],
  );
  // ── Zoom / Pan ────────────────────────────────────────────
  const [zoom, setZoom] = useState(0.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const spaceRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Touch tracking refs for pinch zoom & panning
  const touchStartDistRef = useRef<number>(0);
  const touchStartZoomRef = useRef<number>(1);
  const touchStartMidRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const latestZoomRef = useRef(zoom);
  latestZoomRef.current = zoom;

  const latestPanRef = useRef(pan);
  latestPanRef.current = pan;

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

  // Re-fit whenever full-view is toggled (sidebars appear/disappear)
  useEffect(() => {
    // Small delay so the DOM has time to remove/add the sidebars before measuring
    const t = setTimeout(() => fitToScreen(), 50);
    return () => clearTimeout(t);
  }, [fullView, fitToScreen]);

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

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );
        touchStartDistRef.current = dist;
        touchStartZoomRef.current = latestZoomRef.current;
        touchStartMidRef.current = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
        };
        touchStartPanRef.current = { ...latestPanRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent standard browser pinch zoom and scrolling
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Zoom
        const dist = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );
        if (touchStartDistRef.current > 0) {
          const ratio = dist / touchStartDistRef.current;
          const newZoom = clampZoom(touchStartZoomRef.current * ratio);
          setZoom(newZoom);
        }

        // Pan
        const cx = (touch1.clientX + touch2.clientX) / 2;
        const cy = (touch1.clientY + touch2.clientY) / 2;
        const dx = cx - touchStartMidRef.current.x;
        const dy = cy - touchStartMidRef.current.y;

        setPan({
          x: touchStartPanRef.current.x + dx,
          y: touchStartPanRef.current.y + dy,
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
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
    .filter((node) => !(isOverlayMode && node.type === "text"))
    .sort((a, b) => a.zIndex - b.zIndex);

  const layersList: BuilderNode[] = useMemo(() => {
    const pageBg = canvas.pageBackgrounds?.[activePage];
    const hasBg = pageBg?.image || pageBg?.video;
    const pageNodes = nodes
      .filter((node) => node.page === activePage)
      .filter((node) => !(isOverlayMode && node.type === "text"));

    if (hasBg) {
      const bgVirtualNode: BuilderNode = {
        id: "page-background",
        page: activePage,
        type: "background",
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
        rotation: 0,
        opacity: 1,
        locked: true,
        visible: true,
        zIndex: pageBg.zIndex ?? 0,
        props: {},
      };
      return [...pageNodes, bgVirtualNode].sort((a, b) => b.zIndex - a.zIndex);
    }
    return pageNodes.sort((a, b) => b.zIndex - a.zIndex);
  }, [nodes, activePage, canvas, isOverlayMode]);

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
    lastCommittedSchemaRef.current = JSON.stringify(savedLayout.schema);
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

      const cmd = e.metaKey || e.ctrlKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length <= 1 && selectedNode?.locked) return;
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (cmd && e.key === "c") {
        e.preventDefault();
        if (selectedId) copyNode(selectedId);
        return;
      }
      if (cmd && e.key === "x") {
        e.preventDefault();
        if (selectedId && !selectedNode?.locked) cutNode(selectedId);
        return;
      }
      if (cmd && e.key === "v") {
        e.preventDefault();
        pasteNode();
        return;
      }
      if (cmd && e.key === "d") {
        e.preventDefault();
        if (selectedId) duplicateNode(selectedId);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    deleteSelected,
    deleteNode,
    selectedNode,
    selectedIds,
    selectedId,
    copyNode,
    cutNode,
    pasteNode,
    duplicateNode,
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = layersList.findIndex((n) => n.id === event.active.id);
    const newIndex = layersList.findIndex((n) => n.id === event.over?.id);
    reorderNodes(arrayMove(layersList, oldIndex, newIndex).map((n) => n.id));
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

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        fullView
          ? "fixed inset-0 z-[100]" /* cover everything — shell is hidden */
          : "-mx-4 -my-5 lg:-mx-5 xl:-mx-8 xl:-my-6" /* cancel shell content padding */,
      )}
      style={{ height: fullView ? "100vh" : "calc(100vh - 4rem)" }}
    >
      <BuilderHeader
        onBack={requestBack}
        saveLabel="Save"
        isSaving={isSaving}
        onSave={() => void handleSave()}
        onUndo={undo}
        onRedo={redo}
        leftContent={
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
                      <span className="ml-1 text-[9px] text-zinc-400">
                        (off)
                      </span>
                    )}
                  </button>
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
                    className="absolute -right-1 -top-1 hidden size-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-[8px] text-zinc-500 shadow-sm hover:border-zinc-500 hover:text-zinc-900 group-hover:flex group-focus-within:flex [@media(pointer:coarse)]:flex"
                  >
                    {isEnabled ? "●" : "○"}
                  </button>
                </div>
              );
            })}
          </div>
        }
        centerContent={
          <BuilderZoomControls
            zoom={zoom}
            hasSelection={!!selectedId}
            onZoomOut={() => setZoom((z) => clampZoom(z - 0.1))}
            onZoomIn={() => setZoom((z) => clampZoom(z + 0.1))}
            onPanToSelection={
              selectedId ? () => panToNode(selectedId) : undefined
            }
          />
        }
        rightMeta={
          <>
            {lastAutoSave && (
              <span
                className="flex items-center gap-1 text-[10px] text-zinc-400"
                title={`Auto-saved at ${new Date(lastAutoSave).toLocaleTimeString()}`}
              >
                <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
                {relativeTime(lastAutoSave)}
              </span>
            )}
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
            <BuilderToolbarButton
              onClick={() => {
                setLocalDrafts(getDrafts());
                setShowLoadDialog(true);
              }}
              title="Load template"
            >
              <FolderOpen className="size-3.5" />
              Load
            </BuilderToolbarButton>
            <BuilderToolbarButton
              onClick={() => {
                pendingLeaveAfterSaveRef.current = false;
                setThemeName("");
                setShowSaveDialog(true);
              }}
              title="Create new theme"
            >
              <Plus className="size-3.5" />
              New theme
            </BuilderToolbarButton>
          </>
        }
      />

      {/* ── Body ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar — Layers ──────────────────── */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Layers
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              {layersList.length}
            </Badge>
          </div>

          {/* Template page empty-state hint */}
          {activePage === "template" && layersList.length === 0 && (
            <div className="mx-2 mb-2 rounded-md border border-orange-200 bg-orange-50 px-2 py-1.5 text-[10px] leading-snug text-orange-800">
              <div className="font-semibold">📋 No nodes on this page</div>
              <div className="mt-0.5 text-orange-700">
                This page was added after your saved theme. Add components from
                the panel below.
              </div>
            </div>
          )}

          {/* Generic empty-state hint */}
          {activePage !== "template" && layersList.length === 0 && (
            <div className="mx-2 mb-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-500">
              No layers yet — add a component below.
            </div>
          )}
          <ScrollArea className="flex-1">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={layersList.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5 px-2 pb-2">
                  {layersList.map((node) => (
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
              {PAGE_COMPONENTS[activePage]
                .filter((type) => !(isOverlayMode && type === "text"))
                .map((type) => {
                  const meta = COMPONENT_META[type];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => addNode(type)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center text-[11px] text-zinc-400">
                        <Icon className="size-3.5" />
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
          onPointerDown={(event) => {
            if (!(event.target as HTMLElement).closest(".builder-rnd-node")) {
              canvasTouchMenu.onPointerDown(event);
            }
          }}
          onPointerMove={canvasTouchMenu.onPointerMove}
          onPointerUp={canvasTouchMenu.onPointerUp}
          onPointerCancel={canvasTouchMenu.onPointerCancel}
          onClickCapture={canvasTouchMenu.onClickCapture}
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
                  borderRadius: 28,
                  outline: "10px solid #1a1a1a",
                  outlineOffset: "0px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Notch */}
                <div className="absolute left-1/2 top-3 z-50 h-1 w-20 -translate-x-1/2 rounded-full bg-black/20" />

                {/* Per-page image background overlay */}
                {canvas.pageBackgrounds?.[activePage]?.image ? (
                  <div
                    className="pointer-events-none absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${canvas.pageBackgrounds[activePage]!.image})`,
                      zIndex: canvas.pageBackgrounds?.[activePage]?.zIndex ?? 0,
                      borderRadius: 28,
                    }}
                  />
                ) : null}

                {/* Per-page video background */}
                {canvas.pageBackgrounds?.[activePage]?.video ? (
                  <video
                    src={canvas.pageBackgrounds[activePage]!.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    style={{
                      zIndex: canvas.pageBackgrounds?.[activePage]?.zIndex ?? 0,
                      borderRadius: 28,
                    }}
                  />
                ) : null}

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

                {visibleNodes.map((node) =>
                  node.visible ? (
                    <Rnd
                      key={node.id}
                      scale={zoom}
                      bounds="parent"
                      disableDragging={node.locked || editingId === node.id}
                      enableResizing={!node.locked && editingId !== node.id}
                      lockAspectRatio={node.lockAspect ?? false}
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
                      onPointerDown={(
                        event: React.PointerEvent<HTMLDivElement>,
                      ) => {
                        longPressNodeRef.current = node.id;
                        selectNode(node.id);
                        nodeTouchMenu.onPointerDown(event);
                      }}
                      onPointerMove={nodeTouchMenu.onPointerMove}
                      onPointerUp={nodeTouchMenu.onPointerUp}
                      onPointerCancel={nodeTouchMenu.onPointerCancel}
                      onClickCapture={nodeTouchMenu.onClickCapture}
                      onDragStart={() => selectNode(node.id)}
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
                      onResizeStart={() => selectNode(node.id)}
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
                        "builder-rnd-node group touch-none",
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
        <VisualContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextNode}
          hasClipboard={!!clipboard}
          onClose={() => setContextMenu(null)}
          onCopy={() =>
            contextNode && runContextAction(() => copyNode(contextNode.id))
          }
          onCut={() =>
            contextNode &&
            !contextNode.locked &&
            runContextAction(() => cutNode(contextNode.id))
          }
          onPaste={() => runContextAction(() => pasteNode())}
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
          onBringForward={() =>
            contextNode && runContextAction(() => bringForward(contextNode.id))
          }
          onSendBackward={() =>
            contextNode && runContextAction(() => sendBackward(contextNode.id))
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

      <BuilderUnsavedDialog
        open={showUnsavedDialog}
        description="Ada perubahan di builder yang belum tersimpan. Kamu bisa tetap di halaman ini, membuang perubahan, atau menyimpan dulu sebelum kembali."
        isSaving={isSaving}
        onCancel={cancelUnsavedLeave}
        onDiscard={handleDiscardAndLeave}
        onSave={() => void saveAndLeave()}
      />

      {showSaveDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSaveDialog();
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
                if (e.key === "Escape") closeSaveDialog();
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeSaveDialog}
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

  function closeSaveDialog() {
    pendingLeaveAfterSaveRef.current = false;
    setShowSaveDialog(false);
  }

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
      lastCommittedSchemaRef.current = JSON.stringify(schema());
      setShowSaveDialog(false);
      setThemeName("");
      toast.success(
        `Theme "${name}" created! Future saves will update it in-place.`,
      );
      if (pendingLeaveAfterSaveRef.current) {
        pendingLeaveAfterSaveRef.current = false;
        leaveBuilder();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save theme");
    } finally {
      setIsSaving(false);
    }
  }
}
