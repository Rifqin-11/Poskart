"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Layers3, Plus, SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type BuilderPanel = "layers" | "add" | "properties";

export function BuilderResponsiveWorkspace({
  isPortraitBuilder,
  canvas,
  desktopLayers,
  desktopProperties,
  desktopClassName,
  zoomControls,
  layersCount,
  activeContextLabel,
  selectedPropertiesLabel,
  layersContent,
  renderAddContent,
  propertiesContent,
}: {
  isPortraitBuilder: boolean;
  canvas: ReactNode;
  desktopLayers: ReactNode;
  desktopProperties: ReactNode;
  desktopClassName?: string;
  zoomControls: ReactNode;
  layersCount: number;
  activeContextLabel: string;
  selectedPropertiesLabel?: string | null;
  layersContent: ReactNode;
  renderAddContent: (closePanel: () => void) => ReactNode;
  propertiesContent: ReactNode;
}) {
  const [activePanel, setActivePanel] = useState<BuilderPanel | null>(null);
  const [panelHeight, setPanelHeight] = useState(52);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const panelDragRef = useRef<{
    startY: number;
    startHeight: number;
    currentHeight: number;
  } | null>(null);

  const closePanel = () => {
    setActivePanel(null);
    setPanelHeight(52);
  };

  const openPanel = (panel: BuilderPanel) => {
    setPanelHeight(52);
    setActivePanel(panel);
  };

  const handleDragStart = (event: PointerEvent<HTMLDivElement>) => {
    const startHeight = (panelHeight / 100) * window.innerHeight;
    panelDragRef.current = {
      startY: event.clientY,
      startHeight,
      currentHeight: panelHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingPanel(true);
  };

  const handleDragMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = panelDragRef.current;
    if (!dragState) return;

    const nextHeight =
      ((dragState.startHeight + dragState.startY - event.clientY) /
        window.innerHeight) *
      100;
    const clampedHeight = Math.min(86, Math.max(24, nextHeight));
    dragState.currentHeight = clampedHeight;
    setPanelHeight(clampedHeight);
  };

  const finishDrag = () => {
    const dragState = panelDragRef.current;
    panelDragRef.current = null;
    setIsDraggingPanel(false);
    if (!dragState) return;

    if (dragState.currentHeight < 36) {
      closePanel();
      return;
    }

    setPanelHeight(dragState.currentHeight >= 69 ? 86 : 52);
  };

  const panelTitle =
    activePanel === "add"
      ? `Add to ${activeContextLabel}`
      : activePanel === "properties"
        ? "Properties"
        : "Layers";
  const panelDescription =
    activePanel === "layers"
      ? "Atur urutan, visibilitas, dan kunci layer."
      : activePanel === "add"
        ? "Select a component to add to the canvas."
        : selectedPropertiesLabel
          ? `Mengatur ${selectedPropertiesLabel}.`
          : "Mengatur canvas dan halaman aktif.";

  return (
    <>
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden",
          !isPortraitBuilder && desktopClassName,
        )}
      >
        {isPortraitBuilder ? (
          <div className="flex h-full w-full min-h-0 min-w-0 [&>*]:min-w-0 [&>*]:flex-1">
            {canvas}
          </div>
        ) : (
          <>
            {desktopLayers}
            {canvas}
            {desktopProperties}
          </>
        )}

        {isPortraitBuilder ? (
          <>
            <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-white/80 bg-white/88 p-1 shadow-xl shadow-zinc-950/10 backdrop-blur-xl">
              {zoomControls}
            </div>

            <nav
              aria-label="Builder panels"
              className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-2xl shadow-zinc-950/15 backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={() => openPanel("layers")}
                className="flex h-11 items-center gap-2 rounded-xl px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <Layers3 className="size-4" />
                Layers
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                  {layersCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => openPanel("add")}
                className="flex h-11 items-center gap-2 rounded-xl px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <Plus className="size-4" />
                Add
              </button>
              <button
                type="button"
                onClick={() => openPanel("properties")}
                className="flex h-11 max-w-48 items-center gap-2 rounded-xl px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <SlidersHorizontal className="size-4 shrink-0" />
                <span className="truncate">
                  {selectedPropertiesLabel
                    ? `${selectedPropertiesLabel} properties`
                    : "Properties"}
                </span>
              </button>
            </nav>
          </>
        ) : null}
      </div>

      {isPortraitBuilder ? (
        <Sheet
          side="bottom"
          open={activePanel !== null}
          onOpenChange={(open) => {
            if (!open) closePanel();
          }}
          className={cn(
            "sm:mx-4 sm:max-w-none",
            !isDraggingPanel && "transition-[height] duration-200 ease-out",
          )}
          style={{ height: `${panelHeight}dvh` }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div
              role="separator"
              aria-label="Drag to resize panel"
              aria-orientation="horizontal"
              className="flex h-8 w-full shrink-0 touch-none cursor-ns-resize items-center justify-center"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onDoubleClick={() =>
                setPanelHeight((height) => (height > 69 ? 52 : 86))
              }
            >
              <div
                className={cn(
                  "h-1.5 w-14 rounded-full bg-zinc-200 transition-colors",
                  isDraggingPanel && "bg-zinc-400",
                )}
              />
            </div>

            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-100 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold capitalize text-zinc-950">
                  {panelTitle}
                </h2>
                <p className="truncate text-xs text-zinc-500">
                  {panelDescription}
                </p>
              </div>
              <p className="ml-auto shrink-0 text-[10px] text-zinc-400">
                Tarik handle untuk mengatur panel
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden pt-2">
              {activePanel === "layers" ? layersContent : null}
              {activePanel === "add" ? renderAddContent(closePanel) : null}
              {activePanel === "properties" ? propertiesContent : null}
            </div>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
