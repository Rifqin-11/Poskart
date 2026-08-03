"use client";

import { useState } from "react";
import { toast } from "sonner";
import { VisualAppearanceProperties } from "@/features/builder/components/properties/visual-appearance-properties";
import { VisualButtonProperties } from "@/features/builder/components/properties/visual-button-properties";
import { VisualCountdownProperties } from "@/features/builder/components/properties/visual-countdown-properties";
import { VisualPhotoResultProperties } from "@/features/builder/components/properties/visual-photo-result-properties";
import { VisualQrProperties } from "@/features/builder/components/properties/visual-qr-properties";
import { VisualTemplateGridProperties } from "@/features/builder/components/properties/visual-template-grid-properties";
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
import type { InspectorTab } from "@/features/builder/components/visual-properties-primitives";
import type { BuilderNode } from "@/types/builder";

const NON_GENERIC_APPEARANCE_TYPES = new Set([
  // these have their own color/style properties — no generic Appearance section needed
  "button",
  "photo-result",
  "template-list",
  "return-countdown",
  "session-countdown",
  "payment-countdown",
  "qr",
  "qr-placeholder",
  "qr-link",
  // camera-view / receipt-preview / template-preview use radius only — handled inline below
  "camera-view",
  "receipt-preview",
  "template-preview",
  // preview-media-toggle uses hardcoded rounded-full — no user-configurable style needed
  "preview-media-toggle",
  // camera overlays and social-handle have color via VisualTextProperties / VisualButtonProperties
  "camera-timer",
  "camera-shot-counter",
  "camera-flash",
  "social-handle",
]);

export function PropertiesPanel({
  selectedNode,
  onStartEdit,
  activeTab,
}: {
  selectedNode?: BuilderNode;
  onStartEdit: (node: BuilderNode) => void;
  activeTab: InspectorTab;
}) {
  const updateNode = useBuilderStore((state) => state.updateNode);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const updateCanvas = useBuilderStore((state) => state.updateCanvas);
  const canvas = useBuilderStore((state) => state.canvas);
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
      updateNodeProps(selectedNode.id, { src: image.url });
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
      const result = await uploadBuilderMedia(file);
      updateNodeProps(selectedNode.id, {
        src: result.url,
        mediaType: result.type,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload media",
      );
    } finally {
      setUploading(false);
    }
  };

  if (!selectedNode) return null;

  const editableText = isEditableTextNode(selectedNode);
  const mediaNode = isMediaNode(selectedNode);
  const isQrNode =
    selectedNode.type === "qr" ||
    selectedNode.type === "qr-placeholder" ||
    selectedNode.type === "qr-link";
  const isCameraOverlay =
    selectedNode.type === "camera-timer" ||
    selectedNode.type === "camera-flash" ||
    selectedNode.type === "camera-shot-counter";
  const showGenericAppearance =
    !editableText &&
    !mediaNode &&
    !NON_GENERIC_APPEARANCE_TYPES.has(selectedNode.type);

  if (activeTab === "layout") {
    return (
      <div className="space-y-2">
        <VisualTransformProperties
          selectedNode={selectedNode}
          editableText={false}
          onStartEdit={onStartEdit}
          updateNode={updateNode}
        />
      </div>
    );
  }

  if (activeTab === "content") {
    return (
      <div className="space-y-2">
        {(editableText || isCameraOverlay) && (
          <VisualTextProperties
            canvas={canvas}
            selectedNode={selectedNode}
            updateCanvas={updateCanvas}
            updateNodeProps={updateNodeProps}
            section="content"
          />
        )}
        {selectedNode.type === "button" && (
          <VisualButtonProperties
            selectedNode={selectedNode}
            uploading={uploading}
            onImageUpload={handleImageUpload}
            updateNodeProps={updateNodeProps}
            section="content"
          />
        )}
        {mediaNode && (
          <VisualMediaProperties
            selectedNode={selectedNode}
            uploading={uploading}
            onMediaUpload={handleMediaUpload}
            updateNodeProps={updateNodeProps}
            section="content"
          />
        )}
        {selectedNode.type === "photo-result" && (
          <VisualPhotoResultProperties
            selectedNode={selectedNode}
            updateNodeProps={updateNodeProps}
          />
        )}
        {selectedNode.type === "template-list" && (
          <VisualTemplateGridProperties
            selectedNode={selectedNode}
            updateNodeProps={updateNodeProps}
            section="content"
          />
        )}
        {isQrNode && (
          <VisualQrProperties
            selectedNode={selectedNode}
            updateNodeProps={updateNodeProps}
            section="content"
          />
        )}
        <VisualCountdownProperties
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
          section="content"
        />
        {editableText && (
          <button
            type="button"
            className="w-full rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            onClick={() => onStartEdit(selectedNode)}
          >
            Edit text on canvas
          </button>
        )}
      </div>
    );
  }

  if (activeTab === "style") {
    return (
      <div className="space-y-2">
        {(editableText || isCameraOverlay) && (
          <VisualTextProperties
            canvas={canvas}
            selectedNode={selectedNode}
            updateCanvas={updateCanvas}
            updateNodeProps={updateNodeProps}
            section="style"
          />
        )}
        {selectedNode.type === "button" && (
          <VisualButtonProperties
            selectedNode={selectedNode}
            uploading={uploading}
            onImageUpload={handleImageUpload}
            updateNodeProps={updateNodeProps}
            section="style"
          />
        )}
        {mediaNode && (
          <VisualMediaProperties
            selectedNode={selectedNode}
            uploading={uploading}
            onMediaUpload={handleMediaUpload}
            updateNodeProps={updateNodeProps}
            section="style"
          />
        )}
        {selectedNode.type === "template-list" && (
          <VisualTemplateGridProperties
            selectedNode={selectedNode}
            updateNodeProps={updateNodeProps}
            section="style"
          />
        )}
        {(selectedNode.type === "camera-view" ||
          selectedNode.type === "receipt-preview" ||
          selectedNode.type === "template-preview") && (
          <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Shape
            </div>
            <label className="block text-xs font-medium text-zinc-500">
              Radius
              <input
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-zinc-400"
                type="number"
                min={0}
                max={999}
                value={
                  selectedNode.type === "camera-view"
                    ? (typeof selectedNode.props.radius === "number" ? selectedNode.props.radius : 8)
                    : selectedNode.type === "receipt-preview"
                    ? (typeof selectedNode.props.radius === "number" ? selectedNode.props.radius : 4)
                    : (typeof selectedNode.props.radius === "number" ? selectedNode.props.radius : 12)
                }
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, {
                    radius: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
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
            section="style"
          />
        )}
        <VisualCountdownProperties
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
          section="style"
        />
      </div>
    );
  }

  if (activeTab === "advanced") {
    return (
      <div className="space-y-2">
        {(editableText || isCameraOverlay) && (
          <VisualTextProperties
            canvas={canvas}
            selectedNode={selectedNode}
            updateCanvas={updateCanvas}
            updateNodeProps={updateNodeProps}
            section="advanced"
          />
        )}
        {selectedNode.type === "button" && (
          <VisualButtonProperties
            selectedNode={selectedNode}
            uploading={uploading}
            onImageUpload={handleImageUpload}
            updateNodeProps={updateNodeProps}
            section="advanced"
          />
        )}
        {isQrNode && (
          <VisualQrProperties
            selectedNode={selectedNode}
            updateNodeProps={updateNodeProps}
            section="advanced"
          />
        )}
        <div className="rounded-lg border border-zinc-200 p-3 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Node
          </div>
          <div className="font-mono text-[10px] text-zinc-400">
            {selectedNode.id}
          </div>
          <div className="font-mono text-[10px] text-zinc-400">
            {selectedNode.type} · {selectedNode.page}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
