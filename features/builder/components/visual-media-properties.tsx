"use client";

import { Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualMediaProperties({
  selectedNode,
  uploading,
  onMediaUpload,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  uploading: boolean;
  onMediaUpload: (file?: File) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const src = readString(selectedNode.props.src, "");
  const mediaType = readString(selectedNode.props.mediaType, "image");
  const directMp4 = isDirectMp4Url(src);

  return (
    <PanelSection
      title="Media"
      icon={<Film className="size-3.5 text-zinc-500" />}
    >
      <label className="block text-xs font-medium text-zinc-500">
        Source URL
        <Input
          className="mt-1"
          value={src}
          placeholder="https://.../file.mp4 or image URL"
          onChange={(event) =>
            updateNodeProps(selectedNode.id, {
              src: event.target.value,
              mediaType: isDirectMp4Url(event.target.value)
                ? "video"
                : "image",
            })
          }
        />
      </label>
      {src && !directMp4 && mediaType === "video" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-4 text-amber-700">
          Direct video URL must point to a real .mp4 file. YouTube or embed
          links are not supported here.
        </div>
      ) : null}
      <label className="block text-xs font-medium text-zinc-500">
        Upload media
        <Input
          className="mt-1"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4"
          disabled={uploading}
          onChange={(event) => onMediaUpload(event.target.files?.[0])}
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
        <div className="text-xs text-zinc-500">Uploading media...</div>
      )}
    </PanelSection>
  );
}

function isDirectMp4Url(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol.startsWith("http") &&
      url.pathname.toLowerCase().endsWith(".mp4")
    );
  } catch {
    return value.trim().toLowerCase().endsWith(".mp4");
  }
}
