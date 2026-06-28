"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BringToFront,
  ChevronRight,
  Clipboard,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Plus,
  Scissors,
  SendToBack,
  Trash2,
  Type,
  Unlock,
  X,
} from "lucide-react";
import { isEditableTextNode } from "@/features/builder/utils";
import { cn } from "@/lib/utils";
import type { BuilderComponentType, BuilderNode } from "@/types/builder";

export function VisualContextMenu({
  x,
  y,
  node,
  hasClipboard,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onEditText,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleVisible,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onAddNode,
}: {
  x: number;
  y: number;
  node?: BuilderNode;
  hasClipboard: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onEditText: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onAddNode: (type: BuilderComponentType) => void;
}) {
  const [layerHover, setLayerHover] = useState(false);
  const menuWidth = 224;
  const safeX = Math.min(x, window.innerWidth - menuWidth - 8);
  const safeY = Math.min(y, window.innerHeight - 340);
  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 transition-colors";
  const kbdClass = "ml-auto text-[10px] font-mono text-zinc-400";

  return (
    <div
      className="fixed z-50 w-56 rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl"
      style={{ left: safeX, top: safeY }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {node ? (
        <>
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {node.type}
          </div>

          {isEditableTextNode(node) ? (
            <button type="button" className={itemClass} onClick={onEditText}>
              <Type className="size-3.5" />
              Edit text
            </button>
          ) : null}

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          <button type="button" className={itemClass} onClick={onCopy}>
            <Copy className="size-3.5" />
            Copy
            <span className={kbdClass}>⌘C</span>
          </button>
          <button type="button" className={itemClass} onClick={onCut}>
            <Scissors className="size-3.5" />
            Cut
            <span className={kbdClass}>⌘X</span>
          </button>
          <button type="button" className={itemClass} onClick={onDuplicate}>
            <Copy className="size-3.5 opacity-50" />
            Duplicate
            <span className={kbdClass}>⌘D</span>
          </button>

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          <div
            className="relative"
            onMouseEnter={() => setLayerHover(true)}
            onMouseLeave={() => setLayerHover(false)}
          >
            <button
              type="button"
              className={cn(itemClass, layerHover && "bg-zinc-100")}
            >
              <Layers className="size-3.5" />
              Layer order
              <ChevronRight className="ml-auto size-3.5 text-zinc-400" />
            </button>

            {layerHover ? (
              <div className="absolute left-full top-0 ml-1 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl">
                <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Layer order
                </div>
                <button
                  type="button"
                  className={itemClass}
                  onClick={onBringToFront}
                >
                  <BringToFront className="size-3.5" />
                  Bring to front
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={onBringForward}
                >
                  <ArrowUpToLine className="size-3.5" />
                  Bring forward
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={onSendBackward}
                >
                  <ArrowDownToLine className="size-3.5" />
                  Send backward
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={onSendToBack}
                >
                  <SendToBack className="size-3.5" />
                  Send to back
                </button>
              </div>
            ) : null}
          </div>

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          <button type="button" className={itemClass} onClick={onToggleVisible}>
            {node.visible ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {node.visible ? "Hide" : "Show"}
          </button>
          <button type="button" className={itemClass} onClick={onToggleLock}>
            {node.locked ? (
              <Unlock className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            {node.locked ? "Unlock" : "Lock"}
          </button>

          <div className="mx-2 my-1 h-px bg-zinc-100" />

          <button
            type="button"
            className={cn(itemClass, "text-red-600 hover:bg-red-50")}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </>
      ) : (
        <>
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Canvas
          </div>
          {hasClipboard ? (
            <button type="button" className={itemClass} onClick={onPaste}>
              <Clipboard className="size-3.5" />
              Paste
              <span className={kbdClass}>⌘V</span>
            </button>
          ) : null}
          {hasClipboard ? <div className="mx-2 my-1 h-px bg-zinc-100" /> : null}
          <div className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Add component
          </div>
          {(
            [
              "text",
              "button",
              "image",
              "background-decoration",
            ] as BuilderComponentType[]
          ).map((type) => (
            <button
              key={type}
              type="button"
              className={itemClass}
              onClick={() => onAddNode(type)}
            >
              <Plus className="size-3.5" />
              {type}
            </button>
          ))}
        </>
      )}

      <div className="mx-2 my-1 h-px bg-zinc-100" />
      <button
        type="button"
        className={cn(itemClass, "text-zinc-400 hover:text-zinc-600")}
        onClick={onClose}
      >
        <X className="size-3.5" />
        Close
      </button>
    </div>
  );
}
