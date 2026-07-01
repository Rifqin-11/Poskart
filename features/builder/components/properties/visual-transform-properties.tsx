"use client";

import { Link2, Move, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { cn } from "@/lib/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualTransformProperties({
  selectedNode,
  editableText,
  onStartEdit,
  updateNode,
}: {
  selectedNode: BuilderNode;
  editableText: boolean;
  onStartEdit: (node: BuilderNode) => void;
  updateNode: (id: string, patch: Partial<BuilderNode>) => void;
}) {
  return (
    <PanelSection
      title="Transform"
      icon={<Move className="size-3.5 text-zinc-500" />}
    >
      <div className="grid grid-cols-2 gap-2">
        {(["x", "y"] as const).map((key) => (
          <label key={key} className="text-xs font-medium text-zinc-500">
            {key.toUpperCase()}
            <Input
              className="mt-1"
              type="number"
              value={selectedNode[key]}
              onChange={(event) =>
                updateNode(selectedNode.id, {
                  [key]: Number(event.target.value),
                })
              }
            />
          </label>
        ))}
      </div>
      <div className="flex items-end gap-1">
        <label className="flex-1 text-xs font-medium text-zinc-500">
          W
          <Input
            className="mt-1"
            type="number"
            value={selectedNode.width}
            onChange={(event) => {
              const width = Number(event.target.value);
              const height = selectedNode.lockAspect
                ? Math.round(width * (selectedNode.height / selectedNode.width))
                : selectedNode.height;
              updateNode(selectedNode.id, { width, height });
            }}
          />
        </label>
        <button
          type="button"
          title={
            selectedNode.lockAspect
              ? "Unlock aspect ratio"
              : "Lock aspect ratio"
          }
          onClick={() =>
            updateNode(selectedNode.id, {
              lockAspect: !selectedNode.lockAspect,
            })
          }
          className={cn(
            "mb-0.5 flex size-7 shrink-0 items-center justify-center rounded border transition-colors",
            selectedNode.lockAspect
              ? "border-zinc-900 bg-zinc-950 text-white"
              : "border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700",
          )}
        >
          <Link2 className="size-3" />
        </button>
        <label className="flex-1 text-xs font-medium text-zinc-500">
          H
          <Input
            className="mt-1"
            type="number"
            value={selectedNode.height}
            onChange={(event) => {
              const height = Number(event.target.value);
              const width = selectedNode.lockAspect
                ? Math.round(height * (selectedNode.width / selectedNode.height))
                : selectedNode.width;
              updateNode(selectedNode.id, { width, height });
            }}
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-zinc-500">
        Opacity
        <Slider
          min={0.1}
          max={1}
          step={0.05}
          value={selectedNode.opacity}
          onChange={(event) =>
            updateNode(selectedNode.id, {
              opacity: Number(event.target.value),
            })
          }
        />
      </label>
      <label className="block text-xs font-medium text-zinc-500">
        Rotation
        <Input
          className="mt-1"
          type="number"
          value={selectedNode.rotation}
          onChange={(event) =>
            updateNode(selectedNode.id, {
              rotation: Number(event.target.value),
            })
          }
        />
      </label>
      {editableText && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onStartEdit(selectedNode)}
        >
          <Type className="size-4" /> Edit text on canvas
        </Button>
      )}
    </PanelSection>
  );
}
