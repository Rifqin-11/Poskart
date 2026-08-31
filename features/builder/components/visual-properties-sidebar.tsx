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
  const selectedNodeMeta = selectedNode
    ? COMPONENT_META[selectedNode.type as keyof typeof COMPONENT_META]
    : undefined;
  const SelectedNodeIcon = selectedNodeMeta?.icon ?? LayoutTemplate;

  return (
    <aside
      data-builder-tour="properties"
      className={cn(
        "flex shrink-0 flex-col bg-[#fcfcfb]",
        embedded ? "h-full min-h-0 w-full" : "w-full border-l border-zinc-200/80",
      )}
    >
      <div className="shrink-0 border-b border-zinc-200/80 bg-white">
        {context === "canvas" ? (
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div className="grid size-7 place-items-center rounded-lg bg-[#e9f0fb] text-[#174a7e]">
              <LayoutTemplate className="size-3.5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-tight text-zinc-900">Canvas</div>
              <div className="text-[10px] text-zinc-400">page settings and behavior</div>
            </div>
          </div>
        ) : selectedNode ? (
          <div className="space-y-2.5 px-3 py-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-zinc-400 transition-colors hover:bg-[#f3f7fd] hover:text-[#174a7e]"
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
            <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#d9e6f7] bg-[#f3f7fd] p-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#174a7e] shadow-sm shadow-blue-950/[0.06]">
                <SelectedNodeIcon className="size-4" strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-900">
                  {friendlyNodeName(selectedNode)}
                </div>
                <span className="block truncate text-[10px] font-medium uppercase tracking-wide text-[#5c7fa5]">
                  {selectedNodeMeta?.label ?? selectedNode.type}
                </span>
              </div>
            </div>
            {selectedNode.type === "camera-timer" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-[1.5] text-amber-800">
                <span className="font-semibold">Capture Delay</span> adalah tombol pilihan durasi di kiosk — bukan teks countdown yang berjalan. User mengetuk node ini untuk memilih 3, 5, atau 10 detik sebelum foto diambil.
              </div>
            )}
          </div>
        ) : null}

        <div className="px-3 pb-2.5" data-builder-tour="inspector-tabs">
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

          <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-sm shadow-zinc-950/[0.01]">
            <button
              type="button"
              className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-zinc-300 hover:text-[#5c7fa5]"
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
