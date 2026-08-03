"use client";

import { useState } from "react";
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
import { Layers, Shapes, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COMPONENT_META, PAGE_COMPONENTS } from "@/features/builder/constants";
import { SortableLayer } from "@/features/builder/components/visual-layer-list";
import { VisualAssetsPanel } from "@/features/builder/components/visual-assets-panel";
import { cn } from "@/lib/utils";
import type {
  BuilderComponentType,
  BuilderNode,
  BuilderPage,
} from "@/types/builder";

type SidebarTab = "layers" | "assets";

const SIDEBAR_TABS: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
  { id: "layers", icon: Layers, label: "Layers" },
  { id: "assets", icon: Package, label: "Assets" },
];

export function VisualLayerSidebar({
  activePage,
  isOverlayMode,
  layersList,
  sensors,
  onAddNode,
  onLayerDragEnd,
  onInsertImage,
  embedded = false,
  mode = "all",
}: {
  activePage: BuilderPage;
  isOverlayMode: boolean;
  layersList: BuilderNode[];
  sensors: SensorDescriptor<SensorOptions>[];
  onAddNode: (type: BuilderComponentType) => void;
  onLayerDragEnd: (event: DragEndEvent) => void;
  onInsertImage?: (url: string) => void;
  embedded?: boolean;
  mode?: "all" | "layers" | "add";
}) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("layers");

  const showLayers = mode !== "add";
  const showAdd = mode !== "layers";

  // embedded (mobile) mode: no tab strip, show as before
  if (embedded) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col bg-white">
        {showLayers && (
          <>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Layers
              </span>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {layersList.length}
              </Badge>
            </div>
            <LayerListContent
              activePage={activePage}
              layersList={layersList}
              sensors={sensors}
              onLayerDragEnd={onLayerDragEnd}
            />
          </>
        )}
        {showAdd && (
          <AddComponentList
            activePage={activePage}
            isOverlayMode={isOverlayMode}
            onAddNode={onAddNode}
          />
        )}
      </aside>
    );
  }

  // desktop mode: icon strip + panel
  return (
    <aside
      data-builder-tour="layers"
      className="flex h-full w-full border-r border-zinc-200 bg-white"
    >
      {/* Icon strip — vertical tabs */}
      <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-zinc-100 py-3">
        {SIDEBAR_TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex size-9 items-center justify-center rounded-md transition-colors",
              activeTab === id
                ? "bg-zinc-900 text-white"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
            )}
          >
            <Icon className="size-[18px]" />
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex min-w-0 flex-1 min-h-0 flex-col overflow-hidden">
        {activeTab === "layers" && (
          <>
            <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
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
                  Add components from the panel below.
                </div>
              </div>
            )}

            {activePage !== "template" && layersList.length === 0 && (
              <div className="mx-2 mb-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-500">
                No layers yet. Add a component below.
              </div>
            )}

            <LayerListContent
              activePage={activePage}
              layersList={layersList}
              sensors={sensors}
              onLayerDragEnd={onLayerDragEnd}
            />

            <AddComponentList
              activePage={activePage}
              isOverlayMode={isOverlayMode}
              onAddNode={onAddNode}
            />
          </>
        )}

        {activeTab === "assets" && (
          <>
            <div className="flex items-center px-3 py-2.5 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Assets
              </span>
            </div>
            <VisualAssetsPanel
              onInsertImage={onInsertImage ?? (() => {})}
            />
          </>
        )}
      </div>
    </aside>
  );
}

/* ─── Sub-components ─── */

function LayerListContent({
  activePage,
  layersList,
  sensors,
  onLayerDragEnd,
}: {
  activePage: BuilderPage;
  layersList: BuilderNode[];
  sensors: SensorDescriptor<SensorOptions>[];
  onLayerDragEnd: (event: DragEndEvent) => void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <DndContext sensors={sensors} onDragEnd={onLayerDragEnd}>
        <SortableContext
          items={layersList.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          {layersList.map((node) => (
            <SortableLayer key={node.id} node={node} />
          ))}
        </SortableContext>
      </DndContext>
    </ScrollArea>
  );
}

function AddComponentList({
  activePage,
  isOverlayMode,
  onAddNode,
}: {
  activePage: BuilderPage;
  isOverlayMode: boolean;
  onAddNode: (type: BuilderComponentType) => void;
}) {
  return (
    <div className="shrink-0 border-t border-zinc-100 p-2">
      <div className="mb-1 flex items-center gap-1 px-1">
        <Shapes className="size-3 text-zinc-300" />
        <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-300">
          Add
        </span>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-500 text-[9px] normal-case">{activePage}</span>
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
                  <Icon className="size-[18px]" />
                </span>
                <span>{meta.label}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
