"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Layers3, Lock, Unlock } from "lucide-react";
import { COMPONENT_META } from "@/features/builder/constants";
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
  const component = COMPONENT_META[node.type];
  const ComponentIcon = component?.icon ?? Layers3;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1.5 rounded-xl border px-1.5 py-1.5 text-xs shadow-sm shadow-zinc-950/[0.015] transition-all duration-200",
        isSelected
          ? "border-[#aac5e6] bg-[#e7f0fb] text-[#174a7e] shadow-md shadow-blue-950/[0.07]"
          : "border-zinc-200/80 bg-white text-zinc-700 hover:border-[#b7cbe6] hover:bg-[#f8fbff]",
      )}
    >
      <button
        className={cn(
          "flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg transition-colors active:cursor-grabbing",
          isSelected ? "text-[#5c7fa5] hover:bg-white/70 hover:text-[#174a7e]" : "text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500",
        )}
        aria-label={`Reorder ${node.id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        className="min-w-0 flex-1 text-left focus-visible:outline-none"
        onClick={() => selectNode(node.id)}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-md",
              isSelected ? "bg-white text-[#174a7e]" : "bg-zinc-100 text-zinc-500",
            )}
          >
            <ComponentIcon className="size-3.5" strokeWidth={2.1} />
          </span>
          <span className="min-w-0">
            <span className={cn("block truncate text-[11px] font-semibold", isSelected ? "text-[#174a7e]" : "text-zinc-700")}>
              {node.id === "page-background" ? "Page background" : component?.label ?? node.type}
            </span>
            <span className={cn("block truncate text-[9px]", isSelected ? "text-[#5c7fa5]" : "text-zinc-400")}>
              {node.id === "page-background" ? "Canvas base" : node.id}
            </span>
          </span>
        </div>
      </button>
      {node.id !== "page-background" ? (
        <>
          <button
            onClick={() => toggleNode(node.id, "visible")}
            aria-label={node.visible ? `Hide ${node.id}` : `Show ${node.id}`}
            className={cn(
              "grid size-6 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white",
              isSelected ? "text-[#5c7fa5] hover:bg-white/70 hover:text-[#174a7e]" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
            )}
          >
            {node.visible ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3" />
            )}
          </button>
          <button
            onClick={() => toggleNode(node.id, "locked")}
            aria-label={node.locked ? `Unlock ${node.id}` : `Lock ${node.id}`}
            className={cn(
              "grid size-6 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white",
              isSelected ? "text-[#5c7fa5] hover:bg-white/70 hover:text-[#174a7e]" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
            )}
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
