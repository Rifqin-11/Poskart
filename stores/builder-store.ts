"use client";

import { create } from "zustand";
import type { BuilderCanvas, BuilderNode, BuilderPage, LayoutSchema } from "@/types/builder";

const pages: BuilderPage[] = ["landing", "payment", "camera", "preview", "thanks"];
const defaultCanvas: BuilderCanvas = {
  width: 1080,
  height: 1920,
  orientation: "portrait",
  backgroundColor: "#ffffff",
};

const initialNodes: BuilderNode[] = [
  {
    id: "node-title",
    type: "text",
    page: "landing",
    x: 72,
    y: 70,
    width: 360,
    height: 68,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 5,
    props: { content: "POSKART", fontSize: 42, fontWeight: 700, color: "#18181b" },
  },
  {
    id: "node-subtitle",
    type: "text",
    page: "landing",
    x: 78,
    y: 132,
    width: 320,
    height: 48,
    rotation: 0,
    opacity: 0.7,
    locked: false,
    visible: true,
    zIndex: 6,
    props: { content: "Receipt photo booth experience", fontSize: 16, color: "#52525b" },
  },
  {
    id: "node-button",
    type: "button",
    page: "landing",
    x: 78,
    y: 225,
    width: 190,
    height: 48,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 7,
    props: { label: "Start session", background: "#18181b", color: "#ffffff", radius: 6, semanticRole: "landing.start_session" },
  },
  {
    id: "node-receipt",
    type: "receipt-preview",
    page: "preview",
    x: 132,
    y: 70,
    width: 246,
    height: 390,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 4,
    props: { title: "POSKART MEMORY", code: "PK-0524" },
  },
  {
    id: "node-qr",
    type: "qr",
    page: "thanks",
    x: 186,
    y: 230,
    width: 132,
    height: 132,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 3,
    props: { label: "Download" },
  },
  // --- Payment screen initial nodes ---
  {
    id: "node-payment-header",
    type: "text",
    page: "payment",
    x: 48,
    y: 48,
    width: 420,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 1,
    props: { content: "Scan QRIS untuk bayar", fontSize: 22, fontWeight: 700, color: "#1B1B1B" },
  },
  {
    id: "node-payment-merchant",
    type: "text",
    page: "payment",
    x: 48,
    y: 96,
    width: 280,
    height: 32,
    rotation: 0,
    opacity: 0.7,
    locked: false,
    visible: true,
    zIndex: 2,
    props: { content: "POSKART", fontSize: 15, fontWeight: 500, color: "#52525b" },
  },
  {
    id: "node-payment-qr",
    type: "qr-placeholder",
    page: "payment",
    x: 136,
    y: 148,
    width: 240,
    height: 240,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 3,
    props: { label: "QRIS" },
  },
  {
    id: "node-payment-instruction",
    type: "text",
    page: "payment",
    x: 56,
    y: 408,
    width: 400,
    height: 28,
    rotation: 0,
    opacity: 0.6,
    locked: false,
    visible: true,
    zIndex: 4,
    props: { content: "Buka aplikasi m-banking atau dompet digital kamu", fontSize: 13, fontWeight: 400, color: "#52525b" },
  },
  {
    id: "node-payment-cancel",
    type: "button",
    page: "payment",
    x: 48,
    y: 600,
    width: 180,
    height: 48,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 5,
    props: { label: "Batal", background: "#F5F1E8", color: "#1B1B1B", radius: 8, semanticRole: "payment.cancel" },
  },
  {
    id: "node-payment-confirm",
    type: "button",
    page: "payment",
    x: 248,
    y: 600,
    width: 216,
    height: 48,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 6,
    props: { label: "Sudah Bayar ✓", background: "#C4121A", color: "#ffffff", radius: 8, semanticRole: "payment.confirm" },
  },
  // --- Camera screen initial nodes (mirrors Flutter CameraPage) ---
  {
    id: "node-camera-view",
    type: "camera-view",
    page: "camera",
    x: 0,
    y: 0,
    width: 512,
    height: 480,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 1,
    props: { label: "Camera" },
  },
  {
    id: "node-camera-tape-left",
    type: "background-decoration",
    page: "camera",
    x: -8,
    y: 100,
    width: 56,
    height: 20,
    rotation: -45,
    opacity: 0.85,
    locked: false,
    visible: true,
    zIndex: 2,
    props: { src: "", alt: "tape", objectFit: "cover", radius: 2, backgroundColor: "#F6C9C9" },
  },
  {
    id: "node-camera-tape-right",
    type: "background-decoration",
    page: "camera",
    x: 464,
    y: 360,
    width: 56,
    height: 20,
    rotation: 45,
    opacity: 0.85,
    locked: false,
    visible: true,
    zIndex: 2,
    props: { src: "", alt: "tape", objectFit: "cover", radius: 2, backgroundColor: "#B8C7E5" },
  },
  {
    id: "node-camera-social",
    type: "social-handle",
    page: "camera",
    x: 0,
    y: 486,
    width: 512,
    height: 28,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 3,
    props: { content: "@poskart", fontSize: 14, fontWeight: 600, color: "#1B1B1B" },
  },
  {
    id: "node-camera-counter",
    type: "text",
    page: "camera",
    x: 196,
    y: 520,
    width: 120,
    height: 28,
    rotation: 0,
    opacity: 0.7,
    locked: false,
    visible: true,
    zIndex: 4,
    props: { content: "0 / 4 captured", fontSize: 13, fontWeight: 500, color: "#52525b" },
  },
  {
    id: "node-camera-take-photo",
    type: "button",
    page: "camera",
    x: 176,
    y: 560,
    width: 160,
    height: 60,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 5,
    props: { label: "📸 Ambil Foto", background: "#C4121A", color: "#ffffff", radius: 30, semanticRole: "camera.take_photo" },
  },
  {
    id: "node-camera-continue",
    type: "button",
    page: "camera",
    x: 88,
    y: 636,
    width: 336,
    height: 48,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 6,
    props: { label: "Lanjutkan →", background: "#2D3F8F", color: "#ffffff", radius: 8, semanticRole: "camera.continue" },
  },
  // --- Preview screen initial nodes ---
  {
    id: "node-preview-header",
    type: "text",
    page: "preview",
    x: 48,
    y: 40,
    width: 416,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 1,
    props: { content: "Your Receipt", fontSize: 28, fontWeight: 700, color: "#1B1B1B" },
  },
  {
    id: "node-preview-subheader",
    type: "text",
    page: "preview",
    x: 48,
    y: 80,
    width: 200,
    height: 32,
    rotation: 0,
    opacity: 0.6,
    locked: false,
    visible: true,
    zIndex: 2,
    props: { content: "is ready.", fontSize: 20, fontWeight: 500, color: "#52525b" },
  },
  {
    id: "node-preview-receipt",
    type: "receipt-preview",
    page: "preview",
    x: 56,
    y: 120,
    width: 400,
    height: 380,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 3,
    props: { title: "POSKART MEMORY", code: "PK-0524" },
  },
  {
    id: "node-preview-qr",
    type: "qr",
    page: "preview",
    x: 192,
    y: 516,
    width: 128,
    height: 128,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 4,
    props: { label: "Download" },
  },
  {
    id: "node-preview-caption",
    type: "text",
    page: "preview",
    x: 136,
    y: 650,
    width: 240,
    height: 24,
    rotation: 0,
    opacity: 0.5,
    locked: false,
    visible: true,
    zIndex: 5,
    props: { content: "Scan to download digital copy", fontSize: 11, fontWeight: 400, color: "#52525b" },
  },
  {
    id: "node-preview-finish",
    type: "button",
    page: "preview",
    x: 88,
    y: 680,
    width: 336,
    height: 48,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 6,
    props: { label: "Selesai ✓", background: "#C4121A", color: "#ffffff", radius: 8, semanticRole: "preview.finish" },
  },
  // --- Thanks screen initial nodes ---
  {
    id: "node-thanks-heading",
    type: "text",
    page: "thanks",
    x: 48,
    y: 100,
    width: 416,
    height: 56,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 1,
    props: { content: "Thanks for visiting", fontSize: 32, fontWeight: 700, color: "#1B1B1B" },
  },
  {
    id: "node-thanks-brand",
    type: "text",
    page: "thanks",
    x: 48,
    y: 160,
    width: 280,
    height: 48,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 2,
    props: { content: "POSKART.", fontSize: 36, fontWeight: 800, color: "#C4121A" },
  },
  {
    id: "node-thanks-subheading",
    type: "text",
    page: "thanks",
    x: 48,
    y: 216,
    width: 416,
    height: 40,
    rotation: 0,
    opacity: 0.7,
    locked: false,
    visible: true,
    zIndex: 3,
    props: { content: "Your memories have been printed.", fontSize: 16, fontWeight: 400, color: "#52525b" },
  },
  {
    id: "node-thanks-qr",
    type: "qr",
    page: "thanks",
    x: 186,
    y: 300,
    width: 140,
    height: 140,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 4,
    props: { label: "Download" },
  },
  {
    id: "node-thanks-scan-caption",
    type: "text",
    page: "thanks",
    x: 136,
    y: 448,
    width: 240,
    height: 24,
    rotation: 0,
    opacity: 0.5,
    locked: false,
    visible: true,
    zIndex: 5,
    props: { content: "Scan to download your digital copy", fontSize: 11, fontWeight: 400, color: "#52525b" },
  },
  {
    id: "node-thanks-return",
    type: "text",
    page: "thanks",
    x: 56,
    y: 640,
    width: 400,
    height: 32,
    rotation: 0,
    opacity: 0.45,
    locked: false,
    visible: true,
    zIndex: 6,
    props: { content: "Returning to start in 8 seconds…", fontSize: 13, fontWeight: 400, color: "#52525b" },
  },
];

type BuilderSnapshot = {
  nodes: BuilderNode[];
  canvas: BuilderCanvas;
};

type BuilderState = {
  activePage: BuilderPage;
  selectedId: string | null;
  canvas: BuilderCanvas;
  nodes: BuilderNode[];
  history: BuilderSnapshot[];
  future: BuilderSnapshot[];
  setActivePage: (page: BuilderPage) => void;
  selectNode: (id: string | null) => void;
  updateCanvas: (patch: Partial<BuilderCanvas>) => void;
  setPageBackground: (page: BuilderPage, bg: { image?: string; video?: string }) => void;
  updateNode: (id: string, patch: Partial<BuilderNode>) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  addNode: (type: BuilderNode["type"]) => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  toggleNode: (id: string, key: "visible" | "locked") => void;
  reorderNodes: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  setSchema: (schema: LayoutSchema) => void;
  schema: () => LayoutSchema;
};

function snapshot(state: BuilderState): BuilderSnapshot {
  return { nodes: state.nodes, canvas: state.canvas };
}

function pushHistory(state: BuilderState, patch: Partial<Pick<BuilderState, "nodes" | "canvas" | "selectedId">>) {
  return {
    ...patch,
    history: [...state.history.slice(-24), snapshot(state)],
    future: [],
  };
}

function defaultProps(type: BuilderNode["type"]) {
  if (type === "button") {
    return { label: "Button", background: "#18181b", color: "#ffffff", radius: 6, fontSize: 14 };
  }

  if (type === "qr-placeholder") {
    return { label: "QRIS" };
  }

  if (type === "camera-view") {
    return { label: "Camera" };
  }

  if (type === "image" || type === "stamp" || type === "frame-preview" || type === "background-decoration") {
    return { src: "", alt: type, objectFit: "cover", radius: 8 };
  }

  return { content: type.replace("-", " "), fontSize: 18, color: "#18181b", fontWeight: 500 };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  activePage: "landing",
  selectedId: "node-title",
  canvas: defaultCanvas,
  nodes: initialNodes,
  history: [],
  future: [],
  setActivePage: (page) => set({ activePage: page, selectedId: null }),
  selectNode: (id) => set({ selectedId: id }),
  updateCanvas: (patch) =>
    set((state) => {
      const nextCanvas = { ...state.canvas, ...patch };
      return pushHistory(state, {
        canvas: {
          ...nextCanvas,
          orientation: nextCanvas.width >= nextCanvas.height ? "landscape" : "portrait",
        },
      });
    }),
  setPageBackground: (page, bg) =>
    set((state) =>
      pushHistory(state, {
        canvas: {
          ...state.canvas,
          pageBackgrounds: {
            ...state.canvas.pageBackgrounds,
            [page]: bg,
          },
        },
      }),
    ),
  updateNode: (id, patch) =>
    set((state) =>
      pushHistory(state, { nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)) }),
    ),
  updateNodeProps: (id, props) =>
    set((state) =>
      pushHistory(
        state,
        {
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, props: { ...node.props, ...props } } : node,
          ),
        },
      ),
    ),
  addNode: (type) =>
    set((state) => {
      const id = `node-${Date.now()}`;
      const node: BuilderNode = {
        id,
        type,
        page: state.activePage,
        x: 110,
        y: 120,
        width: type === "text" ? 220 : 140,
        height: type === "text" ? 54 : 120,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: state.nodes.length + 1,
        props: defaultProps(type),
      };
      return pushHistory(state, { nodes: [...state.nodes, node], selectedId: id });
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
      return pushHistory(state, { nodes: [...state.nodes, clone], selectedId: clone.id });
    }),
  deleteNode: (id) =>
    set((state) => pushHistory(state, { nodes: state.nodes.filter((node) => node.id !== id), selectedId: null })),
  toggleNode: (id, key) =>
    set((state) =>
      pushHistory(state, {
        nodes: state.nodes.map((node) => (node.id === id ? { ...node, [key]: !node[key] } : node)),
      }),
    ),
  reorderNodes: (ids) =>
    set((state) => {
      const currentPageNodes = ids
        .map((id, index) => {
          const node = state.nodes.find((candidate) => candidate.id === id);
          return node ? { ...node, zIndex: index + 1 } : null;
        })
        .filter(Boolean) as BuilderNode[];
      const otherNodes = state.nodes.filter((node) => node.page !== state.activePage);
      return pushHistory(state, { nodes: [...otherNodes, ...currentPageNodes] });
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
      nodes: pages.flatMap((page) => schema.pages[page] ?? []),
      canvas: { ...defaultCanvas, ...schema.canvas },
      selectedId: null,
      history: [],
      future: [],
    }),
  schema: () => {
    const state = get();
    return {
      version: 1,
      canvas: state.canvas,
      pages: Object.fromEntries(
        pages.map((page) => [page, state.nodes.filter((node) => node.page === page)]),
      ) as LayoutSchema["pages"],
    };
  },
}));
