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
import type { FrameNode, FrameNodeType } from "@/types/frame-template";

export function FrameLayerSidebar({
  layers,
  selectedId,
  sensors,
  onAddNode,
  onLayerDragEnd,
  onSelectNode,
  onToggleLock,
}: {
  layers: FrameNode[];
  selectedId: string | null;
  sensors: SensorDescriptor<SensorOptions>[];
  onAddNode: (type: FrameNodeType) => void;
  onLayerDragEnd: (event: DragEndEvent) => void;
  onSelectNode: (id: string | null) => void;
  onToggleLock: (id: string, locked: boolean) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-r border-zinc-100">
      <div className="shrink-0 p-4">
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

      <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-100">
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
    </aside>
  );
}
