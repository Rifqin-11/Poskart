"use client";

import type { RefObject } from "react";
import { motion } from "framer-motion";
import { Rnd } from "react-rnd";
import { ColorKeyImage } from "@/features/builder/components/color-key-image";
import {
  builderResizeHandleWrapperStyle,
  builderSelectionOutlineStyle,
  getBuilderResizeHandleStyles,
} from "@/features/builder/shared/builder-selection-handles";
import { NodeRenderer } from "@/features/builder/components/visual-node-renderer";
import { snap } from "@/features/builder/utils";
import { cn } from "@/lib/utils";
import type { BuilderCanvas, BuilderNode, BuilderPage } from "@/types/builder";

type Guide = { type: "h" | "v"; pos: number };
type SnapPreview = { x: number; y: number; w: number; h: number };
type BoxSelect = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type TouchMenuHandlers = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (event: React.MouseEvent<HTMLElement>) => void;
};

export function VisualCanvasStage({
  canvasRef,
  viewportRef,
  activePage,
  canvas,
  zoom,
  pan,
  selectedId,
  editingId,
  editValue,
  visibleNodes,
  guides,
  snapPreview,
  boxSelect,
  isPanning,
  isSpacePanning,
  canvasTouchMenu,
  nodeTouchMenu,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onSelectNode,
  onOpenContextMenu,
  onCanvasToClient,
  onComputeGuides,
  onUpdateNode,
  onClearSnap,
  onSetGuides,
  onSetSnapPreview,
  onSetLongPressNode,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onStartEdit,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  activePage: BuilderPage;
  canvas: BuilderCanvas;
  zoom: number;
  pan: { x: number; y: number };
  selectedId: string | null;
  editingId: string | null;
  editValue: string;
  visibleNodes: BuilderNode[];
  guides: Guide[];
  snapPreview: SnapPreview | null;
  boxSelect: BoxSelect | null;
  isPanning: boolean;
  isSpacePanning: boolean;
  canvasTouchMenu: TouchMenuHandlers;
  nodeTouchMenu: TouchMenuHandlers;
  onCanvasMouseDown: (event: React.MouseEvent) => void;
  onCanvasMouseMove: (event: React.MouseEvent) => void;
  onCanvasMouseUp: () => void;
  onSelectNode: (id: string | null, additive?: boolean) => void;
  onOpenContextMenu: (x: number, y: number, nodeId: string | null) => void;
  onCanvasToClient: (x: number, y: number) => { x: number; y: number };
  onComputeGuides: (
    node: BuilderNode,
    x: number,
    y: number,
  ) => {
    guides: Guide[];
    sx: number;
    sy: number;
    w: number;
    h: number;
    isSnapping: boolean;
  };
  onUpdateNode: (id: string, patch: Partial<BuilderNode>) => void;
  onClearSnap: () => void;
  onSetGuides: (guides: Guide[]) => void;
  onSetSnapPreview: (preview: SnapPreview | null) => void;
  onSetLongPressNode: (id: string | null) => void;
  onEditChange: (value: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onStartEdit: (node: BuilderNode) => void;
}) {
  return (
    <div
      ref={canvasRef}
      className="relative flex-1 overflow-hidden"
      style={{
        background: "#F0F0F2",
        cursor: isPanning ? "grabbing" : isSpacePanning ? "grab" : "default",
      }}
      onClick={() => onSelectNode(null)}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseUp}
      onPointerDown={(event) => {
        if (!(event.target as HTMLElement).closest(".builder-rnd-node")) {
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
      <div ref={viewportRef} className="pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle,rgba(0,0,0,0.10) 1px,transparent 1px)",
          backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
          backgroundPosition: `${pan.x % (22 * zoom)}px ${pan.y % (22 * zoom)}px`,
        }}
      />

      {boxSelect ? (
        <BoxSelectOverlay
          boxSelect={boxSelect}
          zoom={zoom}
          origin={onCanvasToClient(0, 0)}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="pointer-events-auto relative"
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <div className="absolute -top-7 left-0 select-none whitespace-nowrap text-[11px] font-medium capitalize text-zinc-400">
            {activePage} - {canvas.width} x {canvas.height}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
            style={{
              width: canvas.width,
              height: canvas.height,
              backgroundColor: canvas.backgroundColor ?? "#ffffff",
              borderRadius: 28,
              outline: "10px solid #1a1a1a",
              outlineOffset: "0px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute left-1/2 top-3 z-50 h-1 w-20 -translate-x-1/2 rounded-full bg-black/20" />
            <PageBackground canvas={canvas} activePage={activePage} />
            {guides.map((guide, index) => (
              <VisualGuide key={`${guide.type}-${guide.pos}-${index}`} guide={guide} />
            ))}
            {snapPreview ? (
              <VisualSnapPreview preview={snapPreview} canvasWidth={canvas.width} />
            ) : null}
            {visibleNodes.map((node) =>
              node.visible ? (
                <Rnd
                  key={node.id}
                  scale={zoom}
                  bounds="parent"
                  disableDragging={node.locked || editingId === node.id}
                  enableResizing={!node.locked && editingId !== node.id}
                  lockAspectRatio={node.lockAspect ?? false}
                  position={{ x: node.x, y: node.y }}
                  size={{ width: node.width, height: node.height }}
                  resizeHandleStyles={getBuilderResizeHandleStyles(
                    selectedId === node.id,
                  )}
                  resizeHandleWrapperStyle={builderResizeHandleWrapperStyle}
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    onSelectNode(node.id, event.shiftKey);
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
                            w: snapState.w,
                            h: snapState.h,
                          }
                        : null,
                    );
                  }}
                  onDragStop={(_, data) => {
                    const snapState = onComputeGuides(node, data.x, data.y);
                    onUpdateNode(node.id, { x: snapState.sx, y: snapState.sy });
                    onClearSnap();
                  }}
                  onResizeStart={() => onSelectNode(node.id)}
                  onResizeStop={(_, __, ref, ___, position) => {
                    const width = snap(ref.offsetWidth);
                    const height = node.lockAspect
                      ? Math.round(width * (node.height / node.width))
                      : snap(ref.offsetHeight);
                    onUpdateNode(node.id, {
                      width,
                      height,
                      x: snap(position.x),
                      y: snap(position.y),
                    });
                    onClearSnap();
                  }}
                  style={{
                    zIndex: node.zIndex,
                    opacity: node.opacity,
                    transform: `rotate(${node.rotation}deg)`,
                    ...(selectedId === node.id
                      ? builderSelectionOutlineStyle
                      : {}),
                  }}
                  className={cn(
                    "builder-rnd-node group touch-none",
                    node.locked && "cursor-not-allowed",
                  )}
                >
                  <NodeRenderer
                    node={node}
                    editing={editingId === node.id}
                    editValue={editValue}
                    onEditChange={onEditChange}
                    onEditCommit={onEditCommit}
                    onEditCancel={onEditCancel}
                    onStartEdit={() => onStartEdit(node)}
                  />
                </Rnd>
              ) : null,
            )}
          </motion.div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[10px] text-zinc-400 shadow-sm backdrop-blur-sm">
        Ctrl+scroll to zoom - Space+drag to pan - Shift+1 Fit - Shift+2 100% -
        F Pan to selection
      </div>
    </div>
  );
}

function PageBackground({
  canvas,
  activePage,
}: {
  canvas: BuilderCanvas;
  activePage: BuilderPage;
}) {
  const background = canvas.pageBackgrounds?.[activePage];

  return (
    <>
      {background?.image ? (
        <ColorKeyImage
          src={background.image}
          fit="cover"
          radius={28}
          colorKey={background.colorKey}
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{
            zIndex: background.zIndex ?? 0,
          }}
        />
      ) : null}
      {background?.video ? (
        <video
          src={background.video}
          autoPlay
          loop
          muted
          playsInline
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            zIndex: background.zIndex ?? 0,
            borderRadius: 28,
          }}
        />
      ) : null}
    </>
  );
}

function BoxSelectOverlay({
  boxSelect,
  zoom,
  origin,
}: {
  boxSelect: BoxSelect;
  zoom: number;
  origin: { x: number; y: number };
}) {
  const x1 = Math.min(boxSelect.startX, boxSelect.endX);
  const y1 = Math.min(boxSelect.startY, boxSelect.endY);
  const x2 = Math.max(boxSelect.startX, boxSelect.endX);
  const y2 = Math.max(boxSelect.startY, boxSelect.endY);

  return (
    <div
      className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/10"
      style={{
        left: origin.x + x1 * zoom,
        top: origin.y + y1 * zoom,
        width: (x2 - x1) * zoom,
        height: (y2 - y1) * zoom,
      }}
    />
  );
}

function VisualGuide({ guide }: { guide: Guide }) {
  if (guide.type === "v") {
    return (
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{
          left: guide.pos,
          width: 1,
          background: "#F000A0",
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
        background: "#F000A0",
        zIndex: 9999,
        opacity: 0.85,
      }}
    />
  );
}

function VisualSnapPreview({
  preview,
  canvasWidth,
}: {
  preview: SnapPreview;
  canvasWidth: number;
}) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: preview.x,
        top: preview.y,
        width: preview.w,
        height: preview.h,
        border: `${Math.max(2, canvasWidth * 0.0012)}px dashed #F000A0`,
        background: "rgba(240,0,160,0.08)",
        borderRadius: 4,
        zIndex: 9998,
        boxShadow: "0 0 0 1px rgba(240,0,160,0.15)",
      }}
    >
      <div
        className="absolute -top-6 left-0 whitespace-nowrap rounded bg-[#F000A0] px-1.5 py-0.5 font-mono font-semibold text-white"
        style={{ fontSize: Math.max(10, canvasWidth * 0.01) }}
      >
        {preview.x}, {preview.y}
      </div>
    </div>
  );
}
