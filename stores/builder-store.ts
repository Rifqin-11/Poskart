"use client";

import { create } from "zustand";
import {
  buildLayoutSchema,
  builderPages,
  isDeprecatedBuilderNode,
} from "@/lib/builder/schema";
import type {
  BuilderCanvas,
  BuilderNode,
  BuilderPage,
  LayoutSchema,
} from "@/types/builder";
import {
  createDefaultBuilderNodeProps,
  defaultBuilderCanvas,
} from "@/stores/builder-defaults";
import { initialBuilderNodes } from "@/stores/builder-initial-nodes";

type BuilderSnapshot = {
  nodes: BuilderNode[];
  canvas: BuilderCanvas;
};

type BuilderState = {
  activePage: BuilderPage;
  selectedId: string | null;
  /** All currently selected node IDs (for multi-select) */
  selectedIds: string[];
  canvas: BuilderCanvas;
  nodes: BuilderNode[];
  history: BuilderSnapshot[];
  future: BuilderSnapshot[];
  /** When true, AdminShell hides the sidebar + topbar so the builder fills the full viewport */
  builderFullView: boolean;
  setBuilderFullView: (value: boolean) => void;
  /** Node stored by copy/cut for later paste */
  clipboard: BuilderNode | null;
  copyNode: (id: string) => void;
  cutNode: (id: string) => void;
  pasteNode: () => void;
  setActivePage: (page: BuilderPage) => void;
  /** Select a node. Pass multi=true (Shift+click) to toggle membership in selectedIds. */
  selectNode: (id: string | null, multi?: boolean) => void;
  /** Replace entire selection (for box-select) */
  selectNodes: (ids: string[]) => void;
  /** Delete all currently selected nodes */
  deleteSelected: () => void;
  updateCanvas: (patch: Partial<BuilderCanvas>) => void;
  setPageBackground: (
    page: BuilderPage,
    bg: { image?: string; video?: string },
  ) => void;
  updateNode: (id: string, patch: Partial<BuilderNode>) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  addNode: (type: BuilderNode["type"]) => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  toggleNode: (id: string, key: "visible" | "locked") => void;
  reorderNodes: (ids: string[]) => void;
  /** Step one layer forward (swap zIndex with next higher sibling) */
  bringForward: (id: string) => void;
  /** Step one layer backward (swap zIndex with next lower sibling) */
  sendBackward: (id: string) => void;
  undo: () => void;
  redo: () => void;
  setSchema: (schema: LayoutSchema) => void;
  schema: () => LayoutSchema;
  /** Reset all nodes on a single page back to initialBuilderNodes defaults */
  resetPageNodes: (page: BuilderPage) => void;
};

function snapshot(state: BuilderState): BuilderSnapshot {
  return { nodes: state.nodes, canvas: state.canvas };
}

function pushHistory(
  state: BuilderState,
  patch: Partial<Pick<BuilderState, "nodes" | "canvas" | "selectedId">>,
) {
  return {
    ...patch,
    history: [...state.history.slice(-24), snapshot(state)],
    future: [],
  };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  activePage: "landing",
  selectedId: null,
  selectedIds: [],
  canvas: defaultBuilderCanvas,
  nodes: initialBuilderNodes,
  history: [],
  future: [],
  builderFullView: false,
  setBuilderFullView: (value) => set({ builderFullView: value }),
  clipboard: null,
  copyNode: (id) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      if (!node) return state;
      return { clipboard: { ...node } };
    }),
  cutNode: (id) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      if (!node) return state;
      return {
        ...pushHistory(state, {
          nodes: state.nodes.filter((n) => n.id !== id),
          selectedId: null,
        }),
        selectedIds: [],
        clipboard: { ...node },
      };
    }),
  pasteNode: () =>
    set((state) => {
      const src = state.clipboard;
      if (!src) return state;
      const newId = `${src.id}-paste-${Date.now()}`;
      const clone: BuilderNode = {
        ...src,
        id: newId,
        page: state.activePage,
        x: src.x + 24,
        y: src.y + 24,
        locked: false,
        zIndex:
          Math.max(
            0,
            state.canvas.pageBackgrounds?.[state.activePage]?.zIndex ?? 0,
            ...state.nodes
              .filter((n) => n.page === state.activePage)
              .map((n) => n.zIndex),
          ) + 1,
      };
      return {
        ...pushHistory(state, {
          nodes: [...state.nodes, clone],
          selectedId: newId,
        }),
        // Keep clipboard so user can paste multiple times
      };
    }),
  bringForward: (id) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      if (!node) return state;
      const pageNodes = state.nodes.filter((n) => n.page === node.page);
      // Find the node with the next higher zIndex
      const above = pageNodes
        .filter((n) => n.id !== id && n.zIndex > node.zIndex)
        .sort((a, b) => a.zIndex - b.zIndex)[0];
      if (!above) return state; // already on top
      // Swap zIndexes
      return pushHistory(state, {
        nodes: state.nodes.map((n) => {
          if (n.id === id) return { ...n, zIndex: above.zIndex };
          if (n.id === above.id) return { ...n, zIndex: node.zIndex };
          return n;
        }),
      });
    }),
  sendBackward: (id) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      if (!node) return state;
      const pageNodes = state.nodes.filter((n) => n.page === node.page);
      // Find the node with the next lower zIndex
      const below = pageNodes
        .filter((n) => n.id !== id && n.zIndex < node.zIndex)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      if (!below) return state; // already at bottom
      // Swap zIndexes
      return pushHistory(state, {
        nodes: state.nodes.map((n) => {
          if (n.id === id) return { ...n, zIndex: below.zIndex };
          if (n.id === below.id) return { ...n, zIndex: node.zIndex };
          return n;
        }),
      });
    }),
  setActivePage: (page) =>
    set({ activePage: page, selectedId: null, selectedIds: [] }),
  selectNode: (id, multi) =>
    set((state) => {
      if (!id) return { selectedId: null, selectedIds: [] };
      if (multi) {
        const already = state.selectedIds.includes(id);
        const next = already
          ? state.selectedIds.filter((x) => x !== id)
          : [...state.selectedIds, id];
        return {
          selectedIds: next,
          selectedId: next.length > 0 ? next[next.length - 1] : null,
        };
      }
      return { selectedId: id, selectedIds: [id] };
    }),
  selectNodes: (ids) =>
    set({ selectedIds: ids, selectedId: ids[ids.length - 1] ?? null }),
  deleteSelected: () =>
    set((state) => {
      const ids =
        state.selectedIds.length > 0
          ? state.selectedIds
          : state.selectedId
            ? [state.selectedId]
            : [];
      return {
        ...pushHistory(state, {
          nodes: state.nodes.filter((n) => !ids.includes(n.id)),
          selectedId: null,
        }),
        selectedIds: [],
      };
    }),
  updateCanvas: (patch) =>
    set((state) => {
      const nextCanvas = { ...state.canvas, ...patch };
      return pushHistory(state, {
        canvas: {
          ...nextCanvas,
          orientation:
            nextCanvas.width >= nextCanvas.height ? "landscape" : "portrait",
        },
      });
    }),
  setPageBackground: (page, bg) =>
    set((state) => {
      const existing = state.canvas.pageBackgrounds?.[page] || {};
      return pushHistory(state, {
        canvas: {
          ...state.canvas,
          pageBackgrounds: {
            ...state.canvas.pageBackgrounds,
            [page]: {
              ...existing,
              ...bg,
              zIndex: existing.zIndex ?? 0,
            },
          },
        },
      });
    }),
  updateNode: (id, patch) =>
    set((state) =>
      pushHistory(state, {
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, ...patch } : node,
        ),
      }),
    ),
  updateNodeProps: (id, props) =>
    set((state) =>
      pushHistory(state, {
        nodes: state.nodes.map((node) =>
          node.id === id
            ? { ...node, props: { ...node.props, ...props } }
            : node,
        ),
      }),
    ),
  addNode: (type) =>
    set((state) => {
      const id = `node-${Date.now()}`;
      const isAspectLocked =
        type === "qr" ||
        type === "qr-link" ||
        type === "return-countdown" ||
        type === "camera-view" ||
        type === "frame-preview" ||
        type === "receipt-preview" ||
        type === "qr-placeholder";

      const defaultWidth =
        type === "text"
          ? 220
          : type === "return-countdown"
            ? 320
            : type === "preview-media-toggle"
              ? 240
            : type === "qr-link"
              ? 320
              : 140;

      const defaultHeight =
        type === "text"
          ? 54
          : type === "return-countdown"
            ? 72
            : type === "preview-media-toggle"
              ? 48
            : type === "qr-link"
              ? 48
              : 140;

      const node: BuilderNode = {
        id,
        type,
        page: state.activePage,
        x: 110,
        y: 120,
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex:
          Math.max(
            0,
            state.canvas.pageBackgrounds?.[state.activePage]?.zIndex ?? 0,
            ...state.nodes
              .filter((item) => item.page === state.activePage)
              .map((item) => item.zIndex),
          ) + 1,
        lockAspect: isAspectLocked,
        props: createDefaultBuilderNodeProps(type),
      };
      return pushHistory(state, {
        nodes: [...state.nodes, node],
        selectedId: id,
      });
    }),
  duplicateNode: (id) =>
    set((state) => {
      const source = state.nodes.find((node) => node.id === id);
      if (!source) return state;
      const clone = {
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        x: source.x + 24,
        y: source.y + 24,
        locked: false,
      };
      return pushHistory(state, {
        nodes: [...state.nodes, clone],
        selectedId: clone.id,
      });
    }),
  deleteNode: (id) =>
    set((state) => ({
      ...pushHistory(state, {
        nodes: state.nodes.filter((node) => node.id !== id),
        selectedId: null,
      }),
      selectedIds: [],
    })),
  toggleNode: (id, key) =>
    set((state) =>
      pushHistory(state, {
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, [key]: !node[key] } : node,
        ),
      }),
    ),
  reorderNodes: (ids) =>
    set((state) => {
      const bgIndex = ids.indexOf("page-background");
      const totalLayers = ids.length;
      const nextNodes = state.nodes.map((node) => {
        if (node.page !== state.activePage) return node;
        const idx = ids.indexOf(node.id);
        if (idx === -1) return node;
        return { ...node, zIndex: totalLayers - idx };
      });

      if (bgIndex !== -1) {
        const pageBg = state.canvas.pageBackgrounds?.[state.activePage] || {};
        return pushHistory(state, {
          nodes: nextNodes,
          canvas: {
            ...state.canvas,
            pageBackgrounds: {
              ...state.canvas.pageBackgrounds,
              [state.activePage]: {
                ...pageBg,
                zIndex: totalLayers - bgIndex,
              },
            },
          },
        });
      }

      return pushHistory(state, { nodes: nextNodes });
    }),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      if (!previous) return state;
      return {
        nodes: previous.nodes,
        canvas: previous.canvas,
        history: state.history.slice(0, -1),
        future: [snapshot(state), ...state.future],
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        nodes: next.nodes,
        canvas: next.canvas,
        history: [...state.history, snapshot(state)],
        future: state.future.slice(1),
      };
    }),
  setSchema: (schema) =>
    set({
      nodes: builderPages
        .flatMap((page) => schema.pages[page] ?? [])
        .filter((node) => !isDeprecatedBuilderNode(node)),
      canvas: { ...defaultBuilderCanvas, ...schema.canvas },
      selectedId: null,
      selectedIds: [],
      history: [],
      future: [],
    }),
  schema: () => {
    const state = get();
    return buildLayoutSchema(state.canvas, state.nodes);
  },
  resetPageNodes: (page) =>
    set((state) => ({
      ...pushHistory(state, {
        nodes: [
          ...state.nodes.filter((n) => n.page !== page),
          ...initialBuilderNodes.filter((n) => n.page === page),
        ],
      }),
      selectedId: null,
      selectedIds: [],
    })),
}));
