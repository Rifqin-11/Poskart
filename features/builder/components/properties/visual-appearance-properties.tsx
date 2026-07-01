"use client";

import { PaintBucket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualAppearanceProperties({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  return (
    <PanelSection
      title="Appearance"
      icon={<PaintBucket className="size-3.5 text-zinc-500" />}
      defaultOpen={false}
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          Color
          <Input
            className="mt-1"
            value={readString(selectedNode.props.color, "#18181b")}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, { color: event.target.value })
            }
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Radius
          <Input
            className="mt-1"
            type="number"
            value={readNumber(selectedNode.props.radius, 6)}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                radius: Number(event.target.value),
              })
            }
          />
        </label>
      </div>
    </PanelSection>
  );
}
