"use client";

import { type ElementType, type ReactNode, useState } from "react";
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
import { Layers3, Package, Plus, Shapes } from "lucide-react";
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

type SidebarTab = "add" | "layers" | "assets";

const PRIMARY_SIDEBAR_TABS: {
  id: Exclude<SidebarTab, "assets">;
  icon: ElementType;
  label: string;
}[] = [
  { id: "add", icon: Plus, label: "Add node" },
  { id: "layers", icon: Layers3, label: "Layers" },
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

  // Desktop keeps creation separate from layer management.
  return (
    <aside
      data-builder-tour="layers"
      className="flex h-full w-full border-r border-zinc-200/80 bg-[#fcfcfb]"
    >
      <div className="flex w-14 shrink-0 flex-col items-center border-r border-zinc-200/70 bg-white py-3">
        <div className="mb-3 grid size-8 place-items-center rounded-xl bg-[#00357B] text-[11px] font-black text-white shadow-sm shadow-blue-950/20">
          P
        </div>
        <div className="flex flex-col items-center gap-1.5">
          {PRIMARY_SIDEBAR_TABS.map(({ id, icon: Icon, label }) => (
            <SidebarTabButton
              key={id}
              active={activeTab === id}
              icon={Icon}
              label={label}
              onClick={() => setActiveTab(id)}
            />
          ))}
        </div>
        <div className="my-3 h-px w-6 bg-zinc-100" />
        <SidebarTabButton
          active={activeTab === "assets"}
          icon={Package}
          label="Assets"
          onClick={() => setActiveTab("assets")}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {activeTab === "add" && (
          <>
            <PanelHeading
              icon={Plus}
              title="Add node"
              detail={`for ${activePage}`}
            />
            <AddComponentList
              activePage={activePage}
              isOverlayMode={isOverlayMode}
              onAddNode={onAddNode}
            />
          </>
        )}

        {activeTab === "layers" && (
          <>
            <PanelHeading
              icon={Layers3}
              title="Layers"
              detail={`${layersList.length} on this page`}
              trailing={
                <Badge variant="secondary" className="h-5 bg-[#e9f0fb] px-1.5 text-[9px] text-[#00357B]">
                  {layersList.length}
                </Badge>
              }
            />

            {activePage === "template" && layersList.length === 0 && (
              <div className="mx-3 mb-3 rounded-xl border border-[#d9e6f7] bg-[#f3f7fd] px-3 py-2.5 text-[11px] leading-snug text-[#24466f]">
                <div className="font-semibold">This page is empty</div>
                <div className="mt-0.5 text-[#587292]">
                  Use the Add node tab to start composing this screen.
                </div>
              </div>
            )}

            {activePage !== "template" && layersList.length === 0 && (
              <div className="mx-3 mb-3 rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-2.5 text-[11px] text-zinc-500">
                No layers yet. Open Add node to place the first component.
              </div>
            )}

            <LayerListContent
              layersList={layersList}
              sensors={sensors}
              onLayerDragEnd={onLayerDragEnd}
            />
          </>
        )}

        {activeTab === "assets" && (
          <>
            <PanelHeading icon={Package} title="Assets" detail="images and fonts" />
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

function SidebarTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group relative grid size-10 place-items-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2",
        active
          ? "bg-[#dce9f8] text-[#174a7e] shadow-sm shadow-blue-950/[0.08]"
          : "text-zinc-400 hover:bg-[#edf3fb] hover:text-[#00357B]",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2.1} />
      <span className="pointer-events-none absolute left-[calc(100%+10px)] z-30 hidden whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
        {label}
      </span>
    </button>
  );
}

function PanelHeading({
  icon: Icon,
  title,
  detail,
  trailing,
}: {
  icon: ElementType;
  title: string;
  detail: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-zinc-200/80 bg-white px-3 py-3">
      <div className="grid size-7 place-items-center rounded-lg bg-[#e9f0fb] text-[#00357B]">
        <Icon className="size-3.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold tracking-tight text-zinc-900">{title}</div>
        <div className="truncate text-[10px] text-zinc-400">{detail}</div>
      </div>
      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  );
}

function LayerListContent({
  layersList,
  sensors,
  onLayerDragEnd,
}: {
  layersList: BuilderNode[];
  sensors: SensorDescriptor<SensorOptions>[];
  onLayerDragEnd: (event: DragEndEvent) => void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1 px-2.5 py-2">
      <DndContext sensors={sensors} onDragEnd={onLayerDragEnd}>
        <SortableContext items={layersList.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {layersList.map((node) => (
              <SortableLayer key={node.id} node={node} />
            ))}
          </div>
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
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-3">
        <div className="mb-3 rounded-xl border border-[#d9e6f7] bg-[#f3f7fd] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#00357B]">
            <Shapes className="size-3.5" />
            Add to {activePage}
          </div>
          <p className="mt-1 text-[10px] leading-4 text-[#587292]">
            Choose a component, then position it on the canvas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
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
                className="group flex min-h-11 items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white px-2.5 text-left text-xs text-zinc-600 shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 hover:-translate-y-px hover:border-[#a9c4e7] hover:bg-[#f8fbff] hover:text-[#00357B] hover:shadow-md hover:shadow-blue-950/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-[#e9f0fb] group-hover:text-[#00357B]">
                  <Icon className="size-3.5" strokeWidth={2.2} />
                </span>
                <span className="font-medium">{meta.label}</span>
                <Plus className="ml-auto size-3.5 text-zinc-300 transition-colors group-hover:text-[#00357B]" />
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
