"use client";

import { AlignCenter, RotateCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CanvasControls } from "@/features/builder/components/visual-canvas-controls";
import { PropertiesPanel } from "@/features/builder/components/visual-properties-panel";
import { cn } from "@/lib/utils";
import type { BuilderNode, LayoutSchema } from "@/types/builder";

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
  return (
    <aside
      data-builder-tour="properties"
      className={cn(
        "flex shrink-0 flex-col bg-white",
        embedded ? "h-full min-h-0 w-full" : "w-72 border-l border-zinc-200",
      )}
    >
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
          onStartEdit={onStartEdit}
        />
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Schema
            </span>
            <RotateCw className="size-3 text-zinc-300" />
          </div>
          <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 p-2.5 text-[9px] leading-4 text-zinc-300">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </div>
      </ScrollArea>
    </aside>
  );
}
