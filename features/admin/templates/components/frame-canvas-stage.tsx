"use client";

import type { RefObject } from "react";
import { Rnd } from "react-rnd";
import {
  builderResizeHandleClasses,
  builderResizeHandleWrapperStyle,
  builderSelectionOutlineStyle,
  getBuilderResizeHandleStyles,
} from "@/features/builder/shared/builder-selection-handles";
import { FrameNodeRenderer } from "@/features/admin/templates/components/frame-node-renderer";
import { cn } from "@/lib/utils";
import type { FrameLayout, FrameNode } from "@/types/frame-template";

type Guide = { type: "h" | "v"; pos: number };
type SnapPreview = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

type TouchMenuHandlers = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (event: React.MouseEvent<HTMLElement>) => void;
};

export function FrameCanvasStage({
  canvasSurfaceRef,
  canvasViewportRef,
  layout,
  zoom,
  pan,
  guides,
  snapPreview,
  selectedId,
  isPanning,
  spaceDown,
  canvasTouchMenu,
  nodeTouchMenu,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onSelectNode,
  onOpenContextMenu,
  onComputeGuides,
  onUpdateNode,
  onClearSnap,
  onSetGuides,
  onSetSnapPreview,
  onSetLongPressNode,
}: {
  canvasSurfaceRef: RefObject<HTMLDivElement | null>;
  canvasViewportRef: RefObject<HTMLDivElement | null>;
  layout: FrameLayout;
  zoom: number;
  pan: { x: number; y: number };
  guides: Guide[];
  snapPreview: SnapPreview | null;
  selectedId: string | null;
  isPanning: boolean;
  spaceDown: boolean;
  canvasTouchMenu: TouchMenuHandlers;
  nodeTouchMenu: TouchMenuHandlers;
  onCanvasMouseDown: (event: React.MouseEvent) => void;
  onCanvasMouseMove: (event: React.MouseEvent) => void;
  onCanvasMouseUp: () => void;
  onSelectNode: (id: string | null) => void;
  onOpenContextMenu: (x: number, y: number, nodeId: string | null) => void;
  onComputeGuides: (
    node: FrameNode,
    x: number,
    y: number,
    width?: number,
    height?: number,
  ) => {
    guides: Guide[];
    sx: number;
    sy: number;
    w: number;
    h: number;
    isSnapping: boolean;
  };
  onUpdateNode: (id: string, patch: Partial<FrameNode>) => void;
  onClearSnap: () => void;
  onSetGuides: (guides: Guide[]) => void;
  onSetSnapPreview: (preview: SnapPreview | null) => void;
  onSetLongPressNode: (id: string | null) => void;
}) {
  return (
    <main
      ref={canvasSurfaceRef}
      className="relative min-w-0 overflow-hidden bg-zinc-100"
      style={{
        cursor: isPanning ? "grabbing" : spaceDown ? "grab" : "default",
      }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseUp}
      onPointerDown={(event) => {
        if (!(event.target as HTMLElement).closest(".frame-rnd-node")) {
          canvasTouchMenu.onPointerDown(event);
        }
      }}
      onPointerMove={canvasTouchMenu.onPointerMove}
      onPointerUp={canvasTouchMenu.onPointerUp}
      onPointerCancel={canvasTouchMenu.onPointerCancel}
      onClickCapture={canvasTouchMenu.onClickCapture}
      onContextMenu={(event) => {
        event.preventDefault();
        onSelectNode(null);
        onOpenContextMenu(event.clientX, event.clientY, null);
      }}
    >
      <div ref={canvasViewportRef} className="pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)",
          backgroundPosition: `${pan.x % (22 * zoom)}px ${pan.y % (22 * zoom)}px`,
          backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="pointer-events-auto relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <div className="absolute -top-7 left-0 select-none whitespace-nowrap text-[11px] font-medium text-zinc-400">
            Frame template - {layout.canvas.width} x {layout.canvas.height}px
          </div>
          <div
            className="relative overflow-hidden rounded-lg shadow-2xl"
            style={{
              width: layout.canvas.width,
              height: layout.canvas.height,
              background: layout.canvas.backgroundColor,
            }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelectNode(null);
              onOpenContextMenu(event.clientX, event.clientY, null);
            }}
          >
            {guides.map((guide, index) => (
              <FrameGuide key={`${guide.type}-${guide.pos}-${index}`} guide={guide} />
            ))}
            {snapPreview ? <FrameSnapPreview preview={snapPreview} /> : null}
            {layout.nodes
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((node) => (
                <Rnd
                  key={node.id}
                  scale={zoom}
                  disableDragging={node.locked}
                  enableResizing={!node.locked}
                  position={{ x: node.x, y: node.y }}
                  size={{ width: node.width, height: node.height }}
                  resizeHandleStyles={getBuilderResizeHandleStyles(
                    selectedId === node.id,
                  )}
                  resizeHandleClasses={builderResizeHandleClasses}
                  resizeHandleWrapperStyle={builderResizeHandleWrapperStyle}
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    onSelectNode(node.id);
                  }}
                  onContextMenu={(event: React.MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectNode(node.id);
                    onOpenContextMenu(event.clientX, event.clientY, node.id);
                  }}
                  onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
                    onSetLongPressNode(node.id);
                    onSelectNode(node.id);
                    nodeTouchMenu.onPointerDown(event);
                  }}
                  onPointerMove={nodeTouchMenu.onPointerMove}
                  onPointerUp={nodeTouchMenu.onPointerUp}
                  onPointerCancel={nodeTouchMenu.onPointerCancel}
                  onClickCapture={nodeTouchMenu.onClickCapture}
                  onDragStart={() => onSelectNode(node.id)}
                  onDrag={(_, data) => {
                    const snapState = onComputeGuides(node, data.x, data.y);
                    onSetGuides(snapState.guides);
                    onSetSnapPreview(
                      snapState.isSnapping
                        ? {
                            x: snapState.sx,
                            y: snapState.sy,
                            w: node.width,
                            h: node.height,
                            rotation: node.rotation,
                          }
                        : null,
                    );
                  }}
                  onDragStop={(_, data) => {
                    const snapState = onComputeGuides(node, data.x, data.y);
                    onUpdateNode(node.id, {
                      x: snapState.sx,
                      y: snapState.sy,
                    });
                    onClearSnap();
                  }}
                  onResize={(_, __, ref, ___, position) => {
                    const snapState = onComputeGuides(
                      node,
                      position.x,
                      position.y,
                      ref.offsetWidth,
                      ref.offsetHeight,
                    );
                    onSetGuides(snapState.guides);
                    onSetSnapPreview(
                      snapState.isSnapping
                        ? {
                            x: snapState.sx,
                            y: snapState.sy,
                            w: snapState.w,
                            h: snapState.h,
                            rotation: node.rotation,
                          }
                        : null,
                    );
                  }}
                  onResizeStart={() => onSelectNode(node.id)}
                  onResizeStop={(_, __, ref, ___, position) => {
                    const snapState = onComputeGuides(
                      node,
                      position.x,
                      position.y,
                      ref.offsetWidth,
                      ref.offsetHeight,
                    );
                    onUpdateNode(node.id, {
                      width: snapState.w,
                      height: snapState.h,
                      x: snapState.sx,
                      y: snapState.sy,
                    });
                    onClearSnap();
                  }}
                  style={{
                    zIndex: node.zIndex,
                    opacity: node.opacity,
                  }}
                  className={cn(
                    "frame-rnd-node group touch-none",
                    node.locked && "cursor-not-allowed",
                    node.id === "frame-background" &&
                      selectedId !== node.id &&
                      "pointer-events-none",
                  )}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      transform: `rotate(${node.rotation}deg)`,
                      transformOrigin: "center center",
                      willChange: node.rotation === 0 ? undefined : "transform",
                      ...(selectedId === node.id
                        ? builderSelectionOutlineStyle
                        : {}),
                    }}
                  >
                    <FrameNodeRenderer node={node} />
                  </div>
                </Rnd>
              ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[10px] text-zinc-400 shadow-sm backdrop-blur-sm">
        Ctrl+scroll to zoom - Scroll to pan - Space+drag to pan - Shift+1 Fit -
        Shift+2 100% - F Pan to selection
      </div>
    </main>
  );
}

function FrameGuide({ guide }: { guide: Guide }) {
  if (guide.type === "v") {
    return (
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{
          left: guide.pos,
          width: 1,
          background: "#f000a0",
          zIndex: 9999,
          opacity: 0.85,
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0"
      style={{
        top: guide.pos,
        height: 1,
        background: "#f000a0",
        zIndex: 9999,
        opacity: 0.85,
      }}
    />
  );
}

function FrameSnapPreview({ preview }: { preview: SnapPreview }) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: preview.x,
        top: preview.y,
        width: preview.w,
        height: preview.h,
        border: "2px dashed #f000a0",
        background: "rgba(240,0,160,0.08)",
        borderRadius: 4,
        transform: `rotate(${preview.rotation}deg)`,
        transformOrigin: "center center",
        zIndex: 9998,
      }}
    />
  );
}
