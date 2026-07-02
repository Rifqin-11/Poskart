"use client";

import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VisualAppearanceProperties } from "@/features/builder/components/properties/visual-appearance-properties";
import { VisualButtonProperties } from "@/features/builder/components/properties/visual-button-properties";
import { VisualCountdownProperties } from "@/features/builder/components/properties/visual-countdown-properties";
import { VisualPhotoResultProperties } from "@/features/builder/components/properties/visual-photo-result-properties";
import { VisualQrProperties } from "@/features/builder/components/properties/visual-qr-properties";
import { VisualTextProperties } from "@/features/builder/components/properties/visual-text-properties";
import { VisualTransformProperties } from "@/features/builder/components/properties/visual-transform-properties";
import { VisualMediaProperties } from "@/features/builder/components/visual-media-properties";
import {
  isEditableTextNode,
  isMediaNode,
} from "@/features/builder/utils";
import {
  getBuilderImageValidationError,
  getBuilderMediaValidationError,
  uploadBuilderImage,
  uploadBuilderMedia,
} from "@/lib/services/storage-service";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderNode } from "@/types/builder";

const NON_GENERIC_APPEARANCE_TYPES = new Set([
  "return-countdown",
  "qr",
  "qr-placeholder",
  "qr-link",
]);

export function PropertiesPanel({
  selectedNode,
  onStartEdit,
}: {
  selectedNode?: BuilderNode;
  onStartEdit: (node: BuilderNode) => void;
}) {
  const updateNode = useBuilderStore((state) => state.updateNode);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const updateCanvas = useBuilderStore((state) => state.updateCanvas);
  const canvas = useBuilderStore((state) => state.canvas);
  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file?: File) => {
    if (!selectedNode || !file) return;
    const validationError = getBuilderImageValidationError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const image = await uploadBuilderImage(file);
      updateNodeProps(selectedNode.id, { src: image.url, alt: file.name });
      toast.success("Image uploaded to Cloudflare R2");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload image",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleMediaUpload = async (file?: File) => {
    if (!selectedNode || !file) return;
    const validationError = getBuilderMediaValidationError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const media = await uploadBuilderMedia(file);
      updateNodeProps(selectedNode.id, {
        src: media.url,
        alt: file.name,
        mediaType: media.type,
        storage: media.storage,
      });
      toast.success(
        `${media.type === "video" ? "Video" : "Image"} uploaded to Cloudflare R2`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload media",
      );
    } finally {
      setUploading(false);
    }
  };

  if (!selectedNode) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
        Select a layer to edit position, typography, colors, radius, shadow,
        opacity, and rotation.
      </div>
    );
  }

  const editableText = isEditableTextNode(selectedNode);
  const mediaNode = isMediaNode(selectedNode);
  const isOverlayMode = !!canvas.overlayMode;
  const isQrNode =
    selectedNode.type === "qr" ||
    selectedNode.type === "qr-placeholder" ||
    selectedNode.type === "qr-link";
  const showGenericAppearance =
    !editableText &&
    !mediaNode &&
    !NON_GENERIC_APPEARANCE_TYPES.has(selectedNode.type);

  return (
    <div className="space-y-2">
      <NodeInspectorHeader
        selectedNode={selectedNode}
        onDuplicate={() => duplicateNode(selectedNode.id)}
        onDelete={() => deleteNode(selectedNode.id)}
      />

      <VisualTransformProperties
        selectedNode={selectedNode}
        editableText={editableText}
        onStartEdit={onStartEdit}
        updateNode={updateNode}
      />

      {editableText && !isOverlayMode && (
        <VisualTextProperties
          canvas={canvas}
          selectedNode={selectedNode}
          updateCanvas={updateCanvas}
          updateNodeProps={updateNodeProps}
        />
      )}

      {selectedNode.type === "button" && (
        <VisualButtonProperties
          selectedNode={selectedNode}
          uploading={uploading}
          onImageUpload={handleImageUpload}
          updateNodeProps={updateNodeProps}
        />
      )}

      {mediaNode && (
        <VisualMediaProperties
          selectedNode={selectedNode}
          uploading={uploading}
          onMediaUpload={handleMediaUpload}
          updateNodeProps={updateNodeProps}
        />
      )}

      {selectedNode.type === "photo-result" && (
        <VisualPhotoResultProperties
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
        />
      )}

      {showGenericAppearance && (
        <VisualAppearanceProperties
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
        />
      )}

      {isQrNode && (
        <VisualQrProperties
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
        />
      )}

      <VisualCountdownProperties
        selectedNode={selectedNode}
        updateNodeProps={updateNodeProps}
      />
    </div>
  );
}

function NodeInspectorHeader({
  selectedNode,
  onDuplicate,
  onDelete,
}: {
  selectedNode: BuilderNode;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <div className="text-sm font-semibold capitalize">
          {selectedNode.type}
        </div>
        <div className="font-mono text-[10px] text-zinc-400">
          {selectedNode.id}
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onDuplicate}>
          <Copy className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
