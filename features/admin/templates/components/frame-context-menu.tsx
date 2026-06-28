"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BringToFront,
  ChevronRight,
  Clipboard,
  Copy,
  Layers,
  Lock,
  Scissors,
  SendToBack,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { FRAME_NODE_TYPES } from "@/features/admin/templates/frame-builder.constants";
import { cn } from "@/lib/utils";
import type { FrameNode, FrameNodeType } from "@/types/frame-template";

export function FrameContextMenu({
  x,
  y,
  node,
  hasClipboard,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onToggleLock,
  onAddNode,
}: {
  x: number;
  y: number;
  node?: FrameNode;
  hasClipboard: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onToggleLock: () => void;
  onAddNode: (type: FrameNodeType) => void;
}) {
  const [layerHover, setLayerHover] = useState(false);
  const menuW = 224;
  const safeX = Math.min(x, window.innerWidth - menuW - 8);
  const safeY = Math.min(y, window.innerHeight - 360);
  const item =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 transition-colors";
  const kbd = "ml-auto text-[10px] font-mono text-zinc-400";

  return (
    <div
      className="fixed z-[9999] w-56 rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl"
      style={{ left: safeX, top: safeY }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {node ? (
        <>
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {node.type}
          </div>

          <button type="button" className={item} onClick={onCopy}>
            <Copy className="size-3.5" />
            Copy<span className={kbd}>⌘C</span>
          </button>
          {node.type !== "photo-slot" && node.id !== "frame-background" && (
            <button type="button" className={item} onClick={onCut}>
              <Scissors className="size-3.5" />
              Cut<span className={kbd}>⌘X</span>
            </button>
          )}
          {node.id !== "frame-background" && (
            <button type="button" className={item} onClick={onDuplicate}>
              <Copy className="size-3.5 opacity-50" />
              Duplicate<span className={kbd}>⌘D</span>
            </button>
          )}

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          <div
            className="relative"
            onMouseEnter={() => setLayerHover(true)}
            onMouseLeave={() => setLayerHover(false)}
          >
            <button
              type="button"
              className={cn(item, layerHover && "bg-zinc-100")}
            >
              <Layers className="size-3.5" />
              Layer order
              <ChevronRight className="ml-auto size-3.5 text-zinc-400" />
            </button>
            {layerHover && (
              <div className="absolute left-full top-0 ml-1 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl">
                <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Layer order
                </div>
                <button type="button" className={item} onClick={onBringToFront}>
                  <BringToFront className="size-3.5" />
                  Bring to front
                </button>
                <button type="button" className={item} onClick={onBringForward}>
                  <ArrowUpToLine className="size-3.5" />
                  Bring forward
                </button>
                <button type="button" className={item} onClick={onSendBackward}>
                  <ArrowDownToLine className="size-3.5" />
                  Send backward
                </button>
                <button type="button" className={item} onClick={onSendToBack}>
                  <SendToBack className="size-3.5" />
                  Send to back
                </button>
              </div>
            )}
          </div>

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          <button type="button" className={item} onClick={onToggleLock}>
            {node.locked ? (
              <Unlock className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            {node.locked ? "Unlock" : "Lock"}
          </button>

          {node.id !== "frame-background" ? (
            <>
              <div className="mx-2 my-1 h-px bg-zinc-100" />
              <button
                type="button"
                className={cn(item, "text-red-600 hover:bg-red-50")}
                onClick={onDelete}
                disabled={node.id === "frame-background"}
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </>
          ) : null}
        </>
      ) : (
        <>
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Canvas
          </div>
          {hasClipboard && (
            <button type="button" className={item} onClick={onPaste}>
              <Clipboard className="size-3.5" />
              Paste<span className={kbd}>⌘V</span>
            </button>
          )}
          {hasClipboard && <div className="mx-2 my-1 h-px bg-zinc-100" />}
          <div className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Add layer
          </div>
          {FRAME_NODE_TYPES.map((type) => (
            <button
              key={type.type}
              type="button"
              className={item}
              onClick={() => onAddNode(type.type)}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </>
      )}
      <div className="mx-2 my-1 h-px bg-zinc-100" />
      <button
        type="button"
        className={cn(item, "text-zinc-400 hover:text-zinc-600")}
        onClick={onClose}
      >
        <X className="size-3.5" />
        Close
      </button>
    </div>
  );
}
