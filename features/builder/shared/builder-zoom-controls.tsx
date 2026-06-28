"use client";

import { Crosshair, ZoomIn, ZoomOut } from "lucide-react";
import { BuilderToolbarButton } from "@/features/builder/shared/builder-toolbar-button";

export function BuilderZoomControls({
  zoom,
  hasSelection = false,
  onZoomOut,
  onZoomIn,
  onFitToScreen,
  onPanToSelection,
}: {
  zoom: number;
  hasSelection?: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitToScreen?: () => void;
  onPanToSelection?: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <BuilderToolbarButton onClick={onZoomOut} title="Zoom out">
        <ZoomOut className="size-3.5" />
      </BuilderToolbarButton>
      {onFitToScreen ? (
        <button
          type="button"
          className="h-8 min-w-14 rounded-md px-2 text-center font-mono text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          onClick={onFitToScreen}
          title="Fit to screen"
        >
          {Math.round(zoom * 100)}%
        </button>
      ) : null}
      <BuilderToolbarButton onClick={onZoomIn} title="Zoom in">
        <ZoomIn className="size-3.5" />
      </BuilderToolbarButton>
      {hasSelection && onPanToSelection ? (
        <BuilderToolbarButton
          onClick={onPanToSelection}
          title="Pan to selection (F)"
        >
          <Crosshair className="size-3.5" />
        </BuilderToolbarButton>
      ) : null}
    </div>
  );
}
