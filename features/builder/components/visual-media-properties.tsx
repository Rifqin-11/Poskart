"use client";

import { Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualMediaProperties({
  selectedNode,
  uploading,
  onImageUpload,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  uploading: boolean;
  onImageUpload: (file?: File) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  return (
    <PanelSection
      title="Image"
      icon={<ImageIcon className="size-3.5 text-zinc-500" />}
    >
      <label className="block text-xs font-medium text-zinc-500">
        Source URL
        <Input
          className="mt-1"
          value={readString(selectedNode.props.src, "")}
          placeholder="https://..."
          onChange={(event) =>
            updateNodeProps(selectedNode.id, { src: event.target.value })
          }
        />
      </label>
      <label className="block text-xs font-medium text-zinc-500">
        Upload image
        <Input
          className="mt-1"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          disabled={uploading}
          onChange={(event) => onImageUpload(event.target.files?.[0])}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          Fit
          <Select
            className="mt-1"
            value={readString(selectedNode.props.objectFit, "cover")}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                objectFit: event.target.value,
              })
            }
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </Select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Radius
          <Input
            className="mt-1"
            type="number"
            value={readNumber(selectedNode.props.radius, 8)}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                radius: Number(event.target.value),
              })
            }
          />
        </label>
      </div>
      {uploading && (
        <div className="text-xs text-zinc-500">Uploading image...</div>
      )}
    </PanelSection>
  );
}
