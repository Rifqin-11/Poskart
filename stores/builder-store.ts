"use client";

import { create } from "zustand";
import {
  buildLayoutSchema,
  builderPages,
  isDeprecatedBuilderNode,
} from "@/lib/builder/schema";
import type { BuilderCanvas, BuilderNode, BuilderPage, LayoutSchema } from "@/types/builder";

const defaultCanvas: BuilderCanvas = {
  width: 1280,
  height: 800,
  orientation: "landscape",
  backgroundColor: "#F5F1E8",   // AirmailBorder scaffold cream
  // Flutter payment dialog: maxWidth 520 → 520/1280 = 0.406; height ~600/800 = 0.75
  paymentModal: { widthRatio: 0.406, heightRatio: 0.75, borderRadius: 20, barrierColor: "#1B1B1B", backgroundColor: "#FAF8F2" },
  transitionType: "fade",
  transitionDurationMs: 300,
  transitionCurve: "easeInOut",
};

const initialNodes: BuilderNode[] = [
  // ═══ LANDING ══════════════════════════════════════════
  { id:"ld-start-overlay", type:"button", page:"landing", x:0,y:0,width:1280,height:800, rotation:0,opacity:0.01,locked:false,visible:true,zIndex:1, props:{label:"",background:"transparent",color:"transparent",radius:0,semanticRole:"landing.start_session"} },
  { id:"ld-title", type:"text", page:"landing", x:290,y:270,width:700,height:120, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"POSKART",fontSize:96,fontWeight:700,color:"#C4121A",textAlign:"center"} },
  { id:"ld-subtitle", type:"text", page:"landing", x:320,y:384,width:640,height:64, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Receipt Photobooth",fontSize:40,fontWeight:400,color:"#1B1B1B",textAlign:"center",fontStyle:"italic"} },
  { id:"ld-cta", type:"text", page:"landing", x:40,y:754,width:280,height:28, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Click anywhere to start!",fontSize:16,color:"#C4121A"} },
  { id:"ld-settings", type:"button", page:"landing", x:1160,y:24,width:88,height:40, rotation:0,opacity:1,locked:false,visible:true,zIndex:20, props:{label:"⚙ Settings",background:"transparent",color:"#52525b",radius:8,semanticRole:"landing.settings"} },
  // ═══ TEMPLATE ══════════════════════════════════════════
  { id:"tp-heading", type:"text", page:"template", x:120,y:24,width:400,height:56, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Pilih Template",fontSize:44,fontWeight:700,color:"#C4121A"} },
  { id:"tp-subtitle", type:"text", page:"template", x:120,y:76,width:400,height:36, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"frame postcard kamu",fontSize:24,color:"#1B1B1B",fontStyle:"italic"} },
  { id:"tp-preview", type:"template-preview", page:"template", x:136,y:120,width:296,height:552, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{semanticRole:"template.select"} },
  { id:"tp-name", type:"text", page:"template", x:136,y:680,width:296,height:28, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Classic Postcard",fontSize:18,fontWeight:600,color:"#1B1B1B",fontStyle:"italic"} },
  { id:"tp-desc", type:"text", page:"template", x:136,y:710,width:296,height:24, rotation:0,opacity:0.7,locked:false,visible:true,zIndex:10, props:{content:"Cream paper template",fontSize:13,color:"#52525b"} },
  { id:"tp-list", type:"template-list", page:"template", x:560,y:64,width:680,height:640, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{minTileWidth:280,tileCount:4} },
  { id:"tp-back", type:"button", page:"template", x:40,y:748,width:140,height:44, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{label:"← Kembali",background:"transparent",color:"#1B1B1B",radius:8,semanticRole:"template.back"} },
  { id:"tp-count", type:"text", page:"template", x:968,y:758,width:80,height:32, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"3 foto",fontSize:14,fontWeight:600,color:"#1B1B1B",textAlign:"center"} },
  { id:"tp-continue", type:"button", page:"template", x:1056,y:724,width:180,height:64, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{label:"Lanjutkan →",background:"#C4121A",color:"#ffffff",radius:32,fontSize:16,semanticRole:"template.continue"} },
  // ═══ CAMERA ══════════════════════════════════════════
  { id:"cam-view", type:"camera-view", page:"camera", x:32,y:64,width:680,height:520, rotation:0,opacity:1,locked:false,visible:true,zIndex:5, props:{} },
  { id:"cam-take-photo", type:"button", page:"camera", x:848,y:136,width:192,height:192, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{label:"Take Photo",background:"#C4121A",color:"#ffffff",radius:96,fontSize:14,semanticRole:"camera.take_photo"} },
  { id:"cam-photo-result", type:"photo-result", page:"camera", x:784,y:344,width:440,height:192, rotation:0,opacity:1,locked:false,visible:true,zIndex:7, props:{semanticRole:"camera.photo_result"} },
  { id:"cam-counter", type:"text", page:"camera", x:784,y:542,width:440,height:28, rotation:0,opacity:0.7,locked:false,visible:true,zIndex:10, props:{content:"0 / 2 captured",fontSize:14,color:"#52525b",textAlign:"center"} },
  { id:"cam-social", type:"social-handle", page:"camera", x:40,y:752,width:200,height:28, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"@poskart",fontSize:15,color:"#1B1B1B"} },
  // ═══ PREVIEW ══════════════════════════════════════════
  { id:"pv-heading-1", type:"text", page:"preview", x:40,y:56,width:180,height:56, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Your",fontSize:44,fontWeight:400,color:"#C4121A",fontStyle:"italic"} },
  { id:"pv-heading-2", type:"text", page:"preview", x:214,y:60,width:480,height:48, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Receipt is ready.",fontSize:40,fontWeight:700,color:"#1B1B1B"} },
  { id:"pv-frame", type:"frame-preview", page:"preview", x:176,y:112,width:336,height:552, rotation:0,opacity:1,locked:false,visible:true,zIndex:8, props:{src:"",alt:"Preview Frame",radius:8} },
  { id:"pv-scan-label", type:"text", page:"preview", x:660,y:128,width:320,height:40, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Scan to download",fontSize:22,color:"#1B1B1B",fontStyle:"italic",textAlign:"center"} },
  { id:"pv-qr", type:"qr", page:"preview", x:672,y:172,width:296,height:252, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{label:"Download",semanticRole:"preview.qr_download"} },
  { id:"pv-url", type:"text", page:"preview", x:640,y:432,width:360,height:28, rotation:0,opacity:0.7,locked:false,visible:true,zIndex:10, props:{content:"https://poskart.app/s/...",fontSize:12,color:"#3b82f6",textAlign:"center"} },
  { id:"pv-print", type:"button", page:"preview", x:676,y:468,width:120,height:80, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{label:"Print",background:"#C4121A",color:"#ffffff",radius:40,fontSize:14,semanticRole:"preview.print"} },
  { id:"pv-finish", type:"button", page:"preview", x:812,y:468,width:120,height:80, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{label:"Finish",background:"#C4121A",color:"#ffffff",radius:40,fontSize:14,semanticRole:"preview.finish"} },
  { id:"pv-badge", type:"text", page:"preview", x:24,y:740,width:80,height:28, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Minimal",fontSize:12,fontWeight:600,color:"#52525b"} },
  { id:"pv-caption", type:"text", page:"preview", x:112,y:742,width:640,height:24, rotation:0,opacity:0.8,locked:false,visible:true,zIndex:10, props:{content:"Send your printed memory home — scan the QR to download digital copies.",fontSize:13,color:"#52525b"} },

  // ═══ THANKS ══════════════════════════════════════════
  { id:"th-heading-1", type:"text", page:"thanks", x:56,y:216,width:560,height:56, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Thanks for visiting",fontSize:40,fontWeight:400,color:"#1B1B1B",fontStyle:"italic"} },
  { id:"th-heading-2", type:"text", page:"thanks", x:56,y:264,width:560,height:112, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"POSKART.",fontSize:88,fontWeight:700,color:"#C4121A"} },
  { id:"th-tagline", type:"text", page:"thanks", x:56,y:370,width:560,height:56, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{content:"Your memories have been printed.",fontSize:28,fontWeight:400,color:"#1B1B1B",fontStyle:"italic"} },
  { id:"th-body", type:"text", page:"thanks", x:56,y:436,width:560,height:36, rotation:0,opacity:0.7,locked:false,visible:true,zIndex:10, props:{content:"Don't forget to scan the QR code on your receipt to download a digital copy.",fontSize:13,color:"#52525b"} },
  { id:"th-countdown", type:"return-countdown", page:"thanks", x:56,y:488,width:256,height:44, rotation:0,opacity:1,locked:false,visible:true,zIndex:10, props:{countdownText:"Returning to start",countdownSeconds:8,semanticRole:"thanks.countdown_timer"} },
  { id:"th-frame", type:"frame-preview", page:"thanks", x:720,y:176,width:304,height:480, rotation:0,opacity:1,locked:false,visible:true,zIndex:8, props:{src:"",alt:"Printed Frame",radius:8} },
];

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
  setPageBackground: (page: BuilderPage, bg: { image?: string; video?: string }) => void;
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
  /** Reset all nodes on a single page back to initialNodes defaults */
  resetPageNodes: (page: BuilderPage) => void;
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

  if (type === "image" || type === "frame-preview" || type === "background-decoration") {
    return { src: "", alt: type, objectFit: "cover", radius: 8 };
  }

  if (type === "qr-link") {
    return { label: "https://poskart.app/s/...", fontSize: 12, color: "#3b82f6" };
  }

  if (type === "return-countdown") {
    return { countdownText: "Kembali ke halaman awal", countdownSeconds: 8 };
  }

  return { content: type.replace("-", " "), fontSize: 18, color: "#18181b", fontWeight: 500 };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  activePage: "landing",
  selectedId: null,
  selectedIds: [],
  canvas: defaultCanvas,
  nodes: initialNodes,
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
        zIndex: Math.max(0, ...state.nodes.filter((n) => n.page === state.activePage).map((n) => n.zIndex)) + 1,
      };
      return {
        ...pushHistory(state, { nodes: [...state.nodes, clone], selectedId: newId }),
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
  setActivePage: (page) => set({ activePage: page, selectedId: null, selectedIds: [] }),
  selectNode: (id, multi) =>
    set((state) => {
      if (!id) return { selectedId: null, selectedIds: [] };
      if (multi) {
        const already = state.selectedIds.includes(id);
        const next = already
          ? state.selectedIds.filter((x) => x !== id)
          : [...state.selectedIds, id];
        return { selectedIds: next, selectedId: next.length > 0 ? next[next.length - 1] : null };
      }
      return { selectedId: id, selectedIds: [id] };
    }),
  selectNodes: (ids) => set({ selectedIds: ids, selectedId: ids[ids.length - 1] ?? null }),
  deleteSelected: () =>
    set((state) => {
      const ids = state.selectedIds.length > 0 ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
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
          : type === "qr-link"
          ? 160
          : 140;

      const defaultHeight =
        type === "text"
          ? 54
          : type === "return-countdown"
          ? 72
          : type === "qr-link"
          ? 200
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
        zIndex: state.nodes.length + 1,
        lockAspect: isAspectLocked,
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
    set((state) => ({
      ...pushHistory(state, { nodes: state.nodes.filter((node) => node.id !== id), selectedId: null }),
      selectedIds: [],
    })),
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
      nodes: builderPages
        .flatMap((page) => schema.pages[page] ?? [])
        .filter((node) => !isDeprecatedBuilderNode(node)),
      canvas: { ...defaultCanvas, ...schema.canvas },
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
          ...initialNodes.filter((n) => n.page === page),
        ],
      }),
      selectedId: null,
      selectedIds: [],
    })),
}));
