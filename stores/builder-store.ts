"use client";

import { create } from "zustand";
import type { BuilderNode, BuilderPage, LayoutSchema } from "@/types/builder";

const pages: BuilderPage[] = ["landing", "camera", "preview", "thanks"];

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
    props: { label: "Start session", background: "#18181b", color: "#ffffff", radius: 6 },
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
];

type BuilderState = {
  activePage: BuilderPage;
  selectedId: string | null;
  nodes: BuilderNode[];
  history: BuilderNode[][];
  future: BuilderNode[][];
  setActivePage: (page: BuilderPage) => void;
  selectNode: (id: string | null) => void;
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

function pushHistory(state: BuilderState, nodes: BuilderNode[]) {
  return { nodes, history: [...state.history.slice(-24), state.nodes], future: [] };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  activePage: "landing",
  selectedId: "node-title",
  nodes: initialNodes,
  history: [],
  future: [],
  setActivePage: (page) => set({ activePage: page, selectedId: null }),
  selectNode: (id) => set({ selectedId: id }),
  updateNode: (id, patch) =>
    set((state) => pushHistory(state, state.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)))),
  updateNodeProps: (id, props) =>
    set((state) =>
      pushHistory(
        state,
        state.nodes.map((node) =>
          node.id === id ? { ...node, props: { ...node.props, ...props } } : node,
        ),
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
        props:
          type === "button"
            ? { label: "Button", background: "#18181b", color: "#ffffff", radius: 6 }
            : { content: type.replace("-", " "), fontSize: 18, color: "#18181b" },
      };
      return { ...pushHistory(state, [...state.nodes, node]), selectedId: id };
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
      return { ...pushHistory(state, [...state.nodes, clone]), selectedId: clone.id };
    }),
  deleteNode: (id) =>
    set((state) => ({
      ...pushHistory(state, state.nodes.filter((node) => node.id !== id)),
      selectedId: null,
    })),
  toggleNode: (id, key) =>
    set((state) => pushHistory(state, state.nodes.map((node) => (node.id === id ? { ...node, [key]: !node[key] } : node)))),
  reorderNodes: (ids) =>
    set((state) => {
      const currentPageNodes = ids
        .map((id, index) => {
          const node = state.nodes.find((candidate) => candidate.id === id);
          return node ? { ...node, zIndex: index + 1 } : null;
        })
        .filter(Boolean) as BuilderNode[];
      const otherNodes = state.nodes.filter((node) => node.page !== state.activePage);
      return pushHistory(state, [...otherNodes, ...currentPageNodes]);
    }),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      if (!previous) return state;
      return { nodes: previous, history: state.history.slice(0, -1), future: [state.nodes, ...state.future] };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return { nodes: next, history: [...state.history, state.nodes], future: state.future.slice(1) };
    }),
  setSchema: (schema) =>
    set({
      nodes: pages.flatMap((page) => schema.pages[page] ?? []),
      selectedId: null,
      history: [],
      future: [],
    }),
  schema: () => {
    const state = get();
    return {
      version: 1,
      canvas: { width: 512, height: 720, orientation: "portrait" },
      pages: Object.fromEntries(
        pages.map((page) => [page, state.nodes.filter((node) => node.page === page)]),
      ) as LayoutSchema["pages"],
    };
  },
}));
