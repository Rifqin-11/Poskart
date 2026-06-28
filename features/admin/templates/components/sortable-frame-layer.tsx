"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, Unlock } from "lucide-react";
import { readString } from "@/features/admin/templates/frame-builder.utils";
import { cn } from "@/lib/utils";
import type { FrameNode } from "@/types/frame-template";

export function SortableFrameLayer({
  node,
  selectedId,
  onSelect,
  onToggleLock,
}: {
  node: FrameNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleLock: (id: string, locked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.id, disabled: false });
  const isSelected = selectedId === node.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
        isSelected
          ? "border-zinc-900 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
      )}
    >
      <button
        className={cn(
          "flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-400 active:cursor-grabbing",
          isSelected && "text-zinc-300",
        )}
        aria-label={`Reorder ${node.id}`}
        title="Drag to reorder layer"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onSelect(node.id)}
      >
        <span className={cn("block font-medium", isSelected && "text-white")}>
          {node.type === "photo-slot"
            ? readString(node.props.label, "Photo slot")
            : node.type}
        </span>
        <span
          className={cn(
            "block truncate text-zinc-500",
            isSelected && "text-zinc-300",
          )}
        >
          {node.id}
        </span>
      </button>
      <button
        className={cn(
          "text-zinc-400 hover:text-zinc-700",
          isSelected && "hover:text-white",
        )}
        title={node.locked ? "Unlock layer" : "Lock layer"}
        onClick={() => onToggleLock(node.id, !node.locked)}
      >
        {node.locked ? (
          <Lock className="size-3" />
        ) : (
          <Unlock className="size-3" />
        )}
      </button>
    </div>
  );
}
