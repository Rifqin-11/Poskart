"use client";

import { Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ImageUploadDropzone } from "@/components/ui/image-upload-dropzone";
import { Select } from "@/components/ui/select";
import { ColorKeyControls } from "@/features/builder/components/color-key-controls";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import {
  BUILDER_MEDIA_ACCEPT,
  BUILDER_MEDIA_HELP_TEXT,
  getBuilderMediaValidationError,
  type BuilderMediaUploadStatus,
} from "@/lib/services/storage-service";
import type { BuilderNode } from "@/types/builder";

export function VisualMediaProperties({
  selectedNode,
  uploading,
  uploadStatus,
  onMediaUpload,
  updateNodeProps,
  section,
}: {
  selectedNode: BuilderNode;
  uploading: boolean;
  uploadStatus?: BuilderMediaUploadStatus | null;
  onMediaUpload: (file: File) => Promise<void>;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  section?: "content" | "style" | "advanced";
}) {
  const src = readString(selectedNode.props.src, "");
  const mediaType = readString(selectedNode.props.mediaType, "image");
  const directVideo = isDirectVideoUrl(src);

  // content: source URL and upload
  if (section === "content") {
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
        <ImageUploadDropzone
          compact
          accept={BUILDER_MEDIA_ACCEPT}
          label="Drop media here"
          helperText={BUILDER_MEDIA_HELP_TEXT}
          busyLabel={uploadStatus?.message ?? "Uploading media..."}
          busyDetail={uploadStatus?.detail}
          progress={uploadStatus?.progress}
          disabled={uploading}
          validate={getBuilderMediaValidationError}
          onUpload={onMediaUpload}
        />
      </PanelSection>
    );
  }

  // style: fit, radius, color key
  if (section === "style") {
    return (
      <PanelSection
        title="Media"
        icon={<Film className="size-3.5 text-zinc-500" />}
      >
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
              <option value="none">None</option>
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

  // advanced: nothing media-specific
  return null;
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
