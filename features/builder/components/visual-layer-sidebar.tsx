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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COMPONENT_META, PAGE_COMPONENTS } from "@/features/builder/constants";
import { SortableLayer } from "@/features/builder/components/visual-layer-list";
import { cn } from "@/lib/utils";
import type {
  BuilderComponentType,
  BuilderNode,
  BuilderPage,
} from "@/types/builder";

export function VisualLayerSidebar({
  activePage,
  isOverlayMode,
  layersList,
  sensors,
  onAddNode,
  onLayerDragEnd,
  embedded = false,
  mode = "all",
}: {
  activePage: BuilderPage;
  isOverlayMode: boolean;
  layersList: BuilderNode[];
  sensors: SensorDescriptor<SensorOptions>[];
  onAddNode: (type: BuilderComponentType) => void;
  onLayerDragEnd: (event: DragEndEvent) => void;
  embedded?: boolean;
  mode?: "all" | "layers" | "add";
}) {
  const showLayers = mode !== "add";
  const showAdd = mode !== "layers";

  return (
    <aside
      data-builder-tour="layers"
      className={cn(
        "flex shrink-0 flex-col bg-white",
        embedded ? "h-full min-h-0 w-full" : "w-52 border-r border-zinc-200",
      )}
    >
      {showLayers ? (
        <>
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Layers
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              {layersList.length}
            </Badge>
          </div>

          {activePage === "template" && layersList.length === 0 && (
            <div className="mx-2 mb-2 rounded-md border border-orange-200 bg-orange-50 px-2 py-1.5 text-[10px] leading-snug text-orange-800">
              <div className="font-semibold">No nodes on this page</div>
              <div className="mt-0.5 text-orange-700">
                This page was added after your saved theme. Add components from
                the panel below.
              </div>
            </div>
          )}

          {activePage !== "template" && layersList.length === 0 && (
            <div className="mx-2 mb-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-500">
              No layers yet. Add a component below.
            </div>
          )}

          <ScrollArea className="min-h-0 flex-1">
            <DndContext sensors={sensors} onDragEnd={onLayerDragEnd}>
              <SortableContext
                items={layersList.map((node) => node.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5 px-2 pb-2">
                  {layersList.map((node) => (
                    <SortableLayer key={node.id} node={node} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </>
      ) : null}

      {showAdd ? (
        <div
          className={cn(
            "p-2",
            showLayers
              ? "border-t border-zinc-200"
              : "min-h-0 flex-1 overflow-y-auto",
          )}
        >
          <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Add <span className="text-zinc-300">/</span>{" "}
            <span className="text-zinc-600 normal-case">{activePage}</span>
          </div>
          <div className="grid grid-cols-1 gap-0.5">
            {PAGE_COMPONENTS[activePage]
              .filter((type) => !(isOverlayMode && type === "text"))
              .map((type) => {
                const meta = COMPONENT_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onAddNode(type)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-[11px] text-zinc-400">
                      <Icon className="size-3.5" />
                    </span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
