"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderNode } from "@/types/builder";

export function SortableLayer({ node }: { node: BuilderNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.id });
  const selectNode = useBuilderStore((state) => state.selectNode);
  const selectedId = useBuilderStore((state) => state.selectedId);
  const toggleNode = useBuilderStore((state) => state.toggleNode);
  const isSelected = selectedId === node.id;

  const TYPE_COLORS: Record<string, string> = {
    button: "bg-blue-100 text-blue-700",
    text: "bg-purple-100 text-purple-700",
    "social-handle": "bg-purple-100 text-purple-700",
    "camera-view": "bg-zinc-800 text-white",
    "qr-placeholder": "bg-amber-100 text-amber-700",
    qr: "bg-amber-100 text-amber-700",
    image: "bg-emerald-100 text-emerald-700",
    "frame-preview": "bg-emerald-100 text-emerald-700",
    "preview-media-toggle": "bg-sky-100 text-sky-700",
    "receipt-preview": "bg-violet-100 text-violet-700",
    "template-list": "bg-orange-100 text-orange-700",
    "template-preview": "bg-orange-50 text-orange-600",
    "background-decoration": "bg-zinc-100 text-zinc-500",
    background: "bg-amber-100 text-amber-700",
  };
  const badgeClass =
    node.id === "page-background"
      ? "bg-amber-100 text-amber-700"
      : (TYPE_COLORS[node.type] ?? "bg-zinc-100 text-zinc-500");

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
          "flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded",
          isSelected ? "text-zinc-400" : "text-zinc-400",
        )}
        aria-label={`Reorder ${node.id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => selectNode(node.id)}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              isSelected ? "bg-white/15 text-white" : badgeClass,
            )}
          >
            {node.id === "page-background" ? "BACKGROUND" : node.type}
          </span>
          <span
            className={cn(
              "truncate text-[10px]",
              isSelected ? "text-zinc-300" : "text-zinc-400",
            )}
          >
            {node.id === "page-background" ? "Page Background" : node.id}
          </span>
        </div>
      </button>
      {node.id !== "page-background" ? (
        <>
          <button
            onClick={() => toggleNode(node.id, "visible")}
            className={
              isSelected
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-400 hover:text-zinc-700"
            }
          >
            {node.visible ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3" />
            )}
          </button>
          <button
            onClick={() => toggleNode(node.id, "locked")}
            className={
              isSelected
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-400 hover:text-zinc-700"
            }
          >
            {node.locked ? (
              <Lock className="size-3" />
            ) : (
              <Unlock className="size-3" />
            )}
          </button>
        </>
      ) : (
        <Lock className="size-3 text-zinc-400" />
      )}
    </div>
  );
}
