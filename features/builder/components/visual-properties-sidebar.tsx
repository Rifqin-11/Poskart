"use client";

import { useState } from "react";
import { ArrowLeft, ChevronDown, Copy, LayoutTemplate, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CanvasControls } from "@/features/builder/components/visual-canvas-controls";
import { PropertiesPanel } from "@/features/builder/components/visual-properties-panel";
import {
  InspectorTabs,
  type InspectorTab,
  type CanvasTab,
} from "@/features/builder/components/visual-properties-primitives";
import { COMPONENT_META } from "@/features/builder/constants";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderNode, LayoutSchema } from "@/types/builder";

const NODE_TABS: { id: InspectorTab; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "style", label: "Style" },
  { id: "layout", label: "Layout" },
  { id: "advanced", label: "Advanced" },
];

const CANVAS_TABS: { id: CanvasTab; label: string }[] = [
  { id: "device", label: "Device" },
  { id: "background", label: "Background" },
  { id: "motion", label: "Motion" },
];

function friendlyNodeName(node: BuilderNode): string {
  const meta = COMPONENT_META[node.type as keyof typeof COMPONENT_META];
  const label = meta?.label ?? node.type;
  // If there's a user-facing label/content, prepend it
  const name =
    (node.props.label as string | undefined) ||
    (node.props.content as string | undefined);
  if (name && name.length <= 24) return name;
  return label;
}

export function VisualPropertiesSidebar({
  selectedNode,
  schema,
  onStartEdit,
  embedded = false,
}: {
  selectedNode?: BuilderNode;
  schema: LayoutSchema;
  onStartEdit: (node: BuilderNode) => void;
  embedded?: boolean;
}) {
  const [nodeTab, setNodeTab] = useState<InspectorTab>("content");
  const [canvasTab, setCanvasTab] = useState<CanvasTab>("device");
  const [schemaOpen, setSchemaOpen] = useState(false);

  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);

  const context: "canvas" | "node" = selectedNode ? "node" : "canvas";

  return (
    <aside
      data-builder-tour="properties"
      className={cn(
        "flex shrink-0 flex-col bg-white",
        embedded ? "h-full min-h-0 w-full" : "w-full border-l border-zinc-200",
      )}
    >
      {/* Sticky header */}
      <div className="shrink-0 border-b border-zinc-100">
        {context === "canvas" ? (
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Canvas
            </span>
          </div>
        ) : selectedNode ? (
          <div className="space-y-2 px-3 py-2.5">
            {/* Back + actions row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-700"
                onClick={() => useBuilderStore.getState().selectNode(null)}
              >
                <ArrowLeft className="size-3" />
                Canvas
              </button>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Duplicate"
                  onClick={() => duplicateNode(selectedNode.id)}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            {/* Node name + type */}
            <div>
              <div className="truncate text-sm font-semibold text-zinc-900">
                {friendlyNodeName(selectedNode)}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  {COMPONENT_META[selectedNode.type as keyof typeof COMPONENT_META]?.label ?? selectedNode.type}
                </span>
              </div>
            </div>
            {/* Persistent node-level info banners — always visible, no tab required */}
            {selectedNode.type === "camera-timer" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-[1.5] text-amber-800">
                <span className="font-semibold">Capture Delay</span> adalah tombol pilihan durasi di kiosk — bukan teks countdown yang berjalan. User mengetuk node ini untuk memilih 3, 5, atau 10 detik sebelum foto diambil.
              </div>
            )}
          </div>
        ) : null}

        {/* Tabs */}
        <div className="px-3 pb-2.5">
          {context === "node" ? (
            <InspectorTabs
              tabs={NODE_TABS}
              active={nodeTab}
              onChange={(id) => setNodeTab(id as InspectorTab)}
            />
          ) : (
            <InspectorTabs
              tabs={CANVAS_TABS}
              active={canvasTab}
              onChange={(id) => setCanvasTab(id as CanvasTab)}
            />
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 px-3 pb-4">
        <div className="space-y-2 pt-3">
          {context === "node" && selectedNode ? (
            <PropertiesPanel
              selectedNode={selectedNode}
              onStartEdit={onStartEdit}
              activeTab={nodeTab}
            />
          ) : (
            <CanvasControls activeTab={canvasTab} />
          )}

          {/* Dev-only schema disclosure */}
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-zinc-300 hover:text-zinc-400"
              onClick={() => setSchemaOpen((v) => !v)}
            >
              Schema
              <ChevronDown
                className={cn(
                  "size-3 transition-transform",
                  schemaOpen ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
            {schemaOpen && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-950 p-2.5 text-[9px] leading-4 text-zinc-300">
                {JSON.stringify(schema, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
