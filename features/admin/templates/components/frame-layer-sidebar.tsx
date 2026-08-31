"use client";

import {
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FRAME_NODE_TYPES } from "@/features/admin/templates/frame-builder.constants";
import { SortableFrameLayer } from "@/features/admin/templates/components/sortable-frame-layer";
import { cn } from "@/lib/utils";
import type { FrameNode, FrameNodeType } from "@/types/frame-template";

export function FrameLayerSidebar({
  layers,
  selectedId,
  sensors,
  onAddNode,
  onLayerDragEnd,
  onSelectNode,
  onToggleLock,
  embedded = false,
  mode = "all",
}: {
  layers: FrameNode[];
  selectedId: string | null;
  sensors: SensorDescriptor<SensorOptions>[];
  onAddNode: (type: FrameNodeType) => void;
  onLayerDragEnd: (event: DragEndEvent) => void;
  onSelectNode: (id: string | null) => void;
  onToggleLock: (id: string, locked: boolean) => void;
  embedded?: boolean;
  mode?: "all" | "layers" | "add";
}) {
  const showAdd = mode !== "layers";
  const showLayers = mode !== "add";

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        embedded ? "h-full w-full" : "border-r border-zinc-100",
      )}
    >
      {showAdd ? (
        <div
          data-frame-builder-tour="add"
          className={cn("shrink-0 p-4", !showLayers && "overflow-y-auto")}
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Add layer
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FRAME_NODE_TYPES.map((item) => (
              <Button
                key={item.type}
                variant="outline"
                size="sm"
                onClick={() => onAddNode(item.type)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {showLayers ? (
        <div
          data-frame-builder-tour="layers"
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            showAdd && "border-t border-zinc-100",
          )}
        >
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Layers
            </div>
            <div className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
              {layers.length}
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
            <DndContext sensors={sensors} onDragEnd={onLayerDragEnd}>
              <SortableContext
                items={layers.map((node) => node.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {layers.map((node) => (
                    <SortableFrameLayer
                      key={node.id}
                      node={node}
                      selectedId={selectedId}
                      onSelect={onSelectNode}
                      onToggleLock={onToggleLock}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>
      ) : null}
    </aside>
  );
}
