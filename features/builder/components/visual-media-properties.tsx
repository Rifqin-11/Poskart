"use client";

import { Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ColorKeyControls } from "@/features/builder/components/color-key-controls";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import {
  BUILDER_MEDIA_ACCEPT,
  BUILDER_MEDIA_HELP_TEXT,
} from "@/lib/services/storage-service";
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
  const directVideo = isDirectVideoUrl(src);

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
          placeholder="https://.../file.mp4, .mov, .webm, or image URL"
          onChange={(event) =>
            updateNodeProps(selectedNode.id, {
              src: event.target.value,
              mediaType: isDirectVideoUrl(event.target.value)
                ? "video"
                : "image",
            })
          }
        />
      </label>
      {src && !directVideo && mediaType === "video" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-4 text-amber-700">
          Direct video URL must point to a real MP4, MOV, or WebM file.
          YouTube or embed links are not supported here.
        </div>
      ) : null}
      <label className="block text-xs font-medium text-zinc-500">
        Upload media
        <Input
          className="mt-1"
          type="file"
          accept={BUILDER_MEDIA_ACCEPT}
          disabled={uploading}
          onChange={(event) => {
            onMediaUpload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <span className="mt-1 block text-[10px] font-normal text-zinc-400">
          {BUILDER_MEDIA_HELP_TEXT}
        </span>
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
      {src && mediaType !== "video" && !directVideo ? (
        <ColorKeyControls
          value={selectedNode.props.colorKey}
          onChange={(colorKey) =>
            updateNodeProps(selectedNode.id, { colorKey })
          }
        />
      ) : null}
    </PanelSection>
  );
}

function isDirectVideoUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol.startsWith("http") &&
      /\.(mp4|mov|m4v|webm)$/i.test(url.pathname)
    );
  } catch {
    return /\.(mp4|mov|m4v|webm)$/i.test(value.trim());
  }
}
