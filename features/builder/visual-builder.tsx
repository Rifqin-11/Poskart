"use client";

import { useRouter } from "next/navigation";
import {
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  FolderOpen,
  Plus,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useTouchContextMenu } from "@/lib/hooks/use-touch-context-menu";
import {
  useActiveLayoutSchema,
  useLayoutSchemas,
  useSaveLayoutAsTheme,
} from "@/features/admin/layout/use-layout";
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
import { useBuilderStore } from "@/stores/builder-store";
import { BuilderHeader } from "@/features/builder/shared/builder-header";
import { BuilderToolbarButton } from "@/features/builder/shared/builder-toolbar-button";
import { BuilderUnsavedDialog } from "@/features/builder/shared/builder-unsaved-dialog";
import { BuilderZoomControls } from "@/features/builder/shared/builder-zoom-controls";
import { useBuilderExitGuard } from "@/features/builder/shared/use-builder-exit-guard";
import { VisualCanvasStage } from "@/features/builder/components/visual-canvas-stage";
import { VisualContextMenu } from "@/features/builder/components/visual-context-menu";
import { VisualLayerSidebar } from "@/features/builder/components/visual-layer-sidebar";
import { VisualPageTabs } from "@/features/builder/components/visual-page-tabs";
import { VisualPropertiesSidebar } from "@/features/builder/components/visual-properties-sidebar";
import { VisualLoadDialog } from "@/features/builder/components/visual-load-dialog";
import { VisualSaveDialog } from "@/features/builder/components/visual-save-dialog";
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
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLastAutoSave(getAutoSave()?.savedAt ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  // Keep the canvas fitted to the dedicated builder viewport.
  useEffect(() => {
    const timer = setTimeout(() => fitToScreen(), 50);
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => fitToScreen())
        : null;
    const viewport = viewportRef.current;

    if (viewport) {
      resizeObserver?.observe(viewport);
    }
    window.addEventListener("resize", fitToScreen);

    return () => {
      clearTimeout(timer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", fitToScreen);
    };
  }, [fitToScreen]);

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
      className="flex h-screen flex-col overflow-hidden"
    >
      <BuilderHeader
        onBack={requestBack}
        saveLabel="Save"
        isSaving={isSaving}
        onSave={() => void handleSave()}
        onUndo={undo}
        onRedo={redo}
        leftContent={
          <VisualPageTabs
            activePage={activePage}
            canvas={canvas}
            onSetActivePage={setActivePage}
            onUpdateCanvas={updateCanvas}
          />
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
        <VisualLayerSidebar
          activePage={activePage}
          isOverlayMode={isOverlayMode}
          layersList={layersList}
          sensors={sensors}
          onAddNode={addNode}
          onLayerDragEnd={handleDragEnd}
        />

        <VisualCanvasStage
          canvasRef={canvasRef}
          viewportRef={viewportRef}
          activePage={activePage}
          canvas={canvas}
          zoom={zoom}
          pan={pan}
          selectedId={selectedId}
          editingId={editingId}
          editValue={editValue}
          visibleNodes={visibleNodes}
          guides={guides}
          snapPreview={snapPreview}
          boxSelect={boxSelect}
          isPanning={isPanningRef.current}
          isSpacePanning={spaceRef.current}
          canvasTouchMenu={canvasTouchMenu}
          nodeTouchMenu={nodeTouchMenu}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasMouseMove={handleCanvasMouseMove}
          onCanvasMouseUp={handleCanvasMouseUp}
          onSelectNode={selectNode}
          onOpenContextMenu={(x, y, nodeId) =>
            setContextMenu({ x, y, nodeId })
          }
          onCanvasToClient={canvasToClient}
          onComputeGuides={computeGuides}
          onUpdateNode={updateNode}
          onClearSnap={clearSnap}
          onSetGuides={setGuides}
          onSetSnapPreview={setSnapPreview}
          onSetLongPressNode={(id) => {
            longPressNodeRef.current = id;
          }}
          onEditChange={setEditValue}
          onEditCommit={commitTextEdit}
          onEditCancel={cancelTextEdit}
          onStartEdit={startTextEdit}
        />

        <VisualPropertiesSidebar
          selectedNode={selectedNode}
          schema={schema()}
          onStartEdit={startTextEdit}
        />
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

      {showLoadDialog && (
        <VisualLoadDialog
          loadTab={loadTab}
          setLoadTab={setLoadTab}
          localDrafts={localDrafts}
          dbThemes={dbThemes}
          loadSearch={loadSearch}
          setLoadSearch={setLoadSearch}
          onClose={() => setShowLoadDialog(false)}
          onLoadSchema={handleLoadSchema}
          onDeleteLocalDraft={handleDeleteLocalDraft}
        />
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
        <VisualSaveDialog
          themeName={themeName}
          setThemeName={setThemeName}
          isSaving={isSaving}
          onClose={closeSaveDialog}
          onConfirm={() => void handleSaveConfirm()}
        />
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
