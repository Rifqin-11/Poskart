"use client";

import { useState, type ReactNode } from "react";
import { Copy, Lock, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ColorKeyControls } from "@/features/builder/components/color-key-controls";
import { InspectorTabs } from "@/features/builder/components/visual-properties-primitives";
import {
  readNumber,
  readString,
} from "@/features/admin/templates/frame-builder.utils";
import { TimestampFormatEditor } from "@/features/admin/templates/components/timestamp-format-editor";
import { BUILDER_IMAGE_ACCEPT } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import type { FrameLayout, FrameNode, TimestampPart } from "@/types/frame-template";

type FrameInspectorTab = "frame" | "canvas" | "layer";

export function FramePropertiesPanel({
  detailsPanel,
  layout,
  selectedNode,
  uploading,
  onUpdateCanvas,
  onUpdateNode,
  onUpdateNodeProps,
  onAssignPhotoSlotOrder,
  onDuplicateNode,
  onDeleteNode,
  onUploadToNode,
  embedded = false,
}: {
  detailsPanel?: ReactNode;
  layout: FrameLayout;
  selectedNode?: FrameNode;
  uploading: boolean;
  onUpdateCanvas: (patch: Partial<FrameLayout["canvas"]>) => void;
  onUpdateNode: (id: string, patch: Partial<FrameNode>) => void;
  onUpdateNodeProps: (id: string, props: Record<string, unknown>) => void;
  onAssignPhotoSlotOrder: (id: string, order: number) => void;
  onDuplicateNode: (node: FrameNode) => void;
  onDeleteNode: (node: FrameNode) => void;
  onUploadToNode: (file?: File) => void;
  embedded?: boolean;
}) {
  const frameBackgroundNode = layout.nodes.find(
    (node) =>
      node.id === "frame-background" &&
      readString(node.props.src, "").trim().length > 0,
  );
  const [activeTab, setActiveTab] = useState<FrameInspectorTab>(() =>
    selectedNode ? "layer" : "frame",
  );
  const inspectorTabs = selectedNode
    ? [
        { id: "frame", label: "Frame" },
        { id: "canvas", label: "Canvas" },
        { id: "layer", label: "Layer" },
      ]
    : [
        { id: "frame", label: "Frame" },
        { id: "canvas", label: "Canvas" },
      ];

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white",
        !embedded && "border-l border-zinc-100",
      )}
    >
      <div className="shrink-0 border-b border-zinc-100 px-3 py-2.5">
        <InspectorTabs
          tabs={inspectorTabs}
          active={activeTab}
          onChange={(tab) => setActiveTab(tab as FrameInspectorTab)}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
        <div className="space-y-4 pt-4">
          {activeTab === "frame" ? detailsPanel : null}
          {activeTab === "canvas" ? (
            <>
          <section className="space-y-3 rounded-lg border border-zinc-200 p-3">
            <div className="text-sm font-semibold">Canvas</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-zinc-500">
                Width (px)
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={10000}
                  value={layout.canvas.width}
                  onChange={(event) =>
                    onUpdateCanvas({ width: Number(event.target.value) })
                  }
                />
              </label>
              <label className="text-xs font-medium text-zinc-500">
                Height (px)
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={10000}
                  value={layout.canvas.height}
                  onChange={(event) =>
                    onUpdateCanvas({ height: Number(event.target.value) })
                  }
                />
              </label>
            </div>
            <label className="text-xs font-medium text-zinc-500">
              Background
              <div className="mt-1 grid grid-cols-[42px_1fr] gap-2">
                <Input
                  className="h-9 p-1"
                  type="color"
                  value={layout.canvas.backgroundColor}
                  onChange={(event) =>
                    onUpdateCanvas({ backgroundColor: event.target.value })
                  }
                />
                <Input
                  value={layout.canvas.backgroundColor}
                  onChange={(event) =>
                    onUpdateCanvas({ backgroundColor: event.target.value })
                  }
                />
              </div>
            </label>
          </section>

          {frameBackgroundNode ? (
            <ColorKeyControls
              value={frameBackgroundNode.props.colorKey}
              onChange={(colorKey) =>
                onUpdateNodeProps(frameBackgroundNode.id, { colorKey })
              }
            />
          ) : null}
            </>
          ) : null}

          {activeTab === "layer" && selectedNode ? (
            <section className="space-y-3 rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {selectedNode.type}
                  </div>
                  <div className="text-xs text-zinc-500">{selectedNode.id}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={selectedNode.id === "frame-background"}
                    onClick={() => onDuplicateNode(selectedNode)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      onUpdateNode(selectedNode.id, {
                        locked: !selectedNode.locked,
                      })
                    }
                  >
                    {selectedNode.locked ? (
                      <Unlock className="size-4" />
                    ) : (
                      <Lock className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={selectedNode.id === "frame-background"}
                    onClick={() => onDeleteNode(selectedNode)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label
                    key={key}
                    className="text-xs font-medium text-zinc-500"
                  >
                    {key.toUpperCase()}
                    <Input
                      className="mt-1"
                      type="number"
                      value={Math.round(selectedNode[key])}
                      onChange={(event) =>
                        onUpdateNode(selectedNode.id, {
                          [key]: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>

              <label className="block text-xs font-medium text-zinc-500">
                Opacity
                <Slider
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selectedNode.opacity}
                  onChange={(event) =>
                    onUpdateNode(selectedNode.id, {
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
                    onUpdateNode(selectedNode.id, {
                      rotation: Number(event.target.value),
                    })
                  }
                />
              </label>

              {selectedNode.type === "photo-slot" ? (
                <label className="block text-xs font-medium text-zinc-500">
                  Photo order
                  <Select
                    className="mt-1"
                    value={String(readNumber(selectedNode.props.photoOrder, 1))}
                    onChange={(event) =>
                      onAssignPhotoSlotOrder(
                        selectedNode.id,
                        Number(event.target.value),
                      )
                    }
                  >
                    {layout.nodes
                      .filter((node) => node.type === "photo-slot")
                      .map((_, index) => (
                        <option key={index + 1} value={index + 1}>
                          Photo {index + 1}
                        </option>
                      ))}
                  </Select>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-400">
                    Determines which captured photo is placed in this slot.
                  </p>
                </label>
              ) : null}

              {selectedNode.type === "text" ||
              selectedNode.type === "date-stamp" ||
              selectedNode.type === "timestamp" ? (
                <>
                  {selectedNode.type !== "timestamp" ? (
                  <label className="block text-xs font-medium text-zinc-500">
                    Text
                    <Input
                      className="mt-1"
                      value={readString(selectedNode.props.content, "")}
                      onChange={(event) =>
                        onUpdateNodeProps(selectedNode.id, {
                          content: event.target.value,
                        })
                      }
                    />
                  </label>
                  ) : null}
                  {selectedNode.type === "timestamp" ? (
                    <TimestampFormatEditor
                      parts={(() => {
                        const rawParts = selectedNode.props.parts;
                        return Array.isArray(rawParts)
                          ? (rawParts as TimestampPart[])
                          : (["date", "month", "year"] as TimestampPart[]);
                      })()}
                      separator={readString(
                        selectedNode.props.separator,
                        ".",
                      )}
                      onChangeParts={(parts) =>
                        onUpdateNodeProps(selectedNode.id, { parts })
                      }
                      onChangeSeparator={(separator) =>
                        onUpdateNodeProps(selectedNode.id, { separator })
                      }
                    />
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-zinc-500">
                      Font size
                      <Input
                        className="mt-1"
                        type="number"
                        value={readNumber(selectedNode.props.fontSize, 18)}
                        onChange={(event) =>
                          onUpdateNodeProps(selectedNode.id, {
                            fontSize: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-500">
                      Weight
                      <Input
                        className="mt-1"
                        type="number"
                        step={100}
                        value={readNumber(selectedNode.props.fontWeight, 600)}
                        onChange={(event) =>
                          onUpdateNodeProps(selectedNode.id, {
                            fontWeight: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-zinc-500">
                    Color
                    <div className="mt-1 grid grid-cols-[42px_1fr] gap-2">
                      <Input
                        className="h-9 p-1"
                        type="color"
                        value={readString(selectedNode.props.color, "#18181b")}
                        onChange={(event) =>
                          onUpdateNodeProps(selectedNode.id, {
                            color: event.target.value,
                          })
                        }
                      />
                      <Input
                        value={readString(selectedNode.props.color, "#18181b")}
                        onChange={(event) =>
                          onUpdateNodeProps(selectedNode.id, {
                            color: event.target.value,
                          })
                        }
                      />
                    </div>
                  </label>
                </>
              ) : null}

              {selectedNode.type === "image" ||
              selectedNode.type === "background" ? (
                <>
                  <label className="block text-xs font-medium text-zinc-500">
                    Image URL
                    <Input
                      className="mt-1"
                      value={readString(selectedNode.props.src, "")}
                      onChange={(event) =>
                        onUpdateNodeProps(selectedNode.id, {
                          src: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Upload image
                    <Input
                      className="mt-1"
                      type="file"
                      accept={BUILDER_IMAGE_ACCEPT}
                      disabled={uploading}
                      onChange={(event) => {
                        onUploadToNode(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Fit
                    <Select
                      className="mt-1"
                      value={readString(selectedNode.props.objectFit, "cover")}
                      onChange={(event) =>
                        onUpdateNodeProps(selectedNode.id, {
                          objectFit: event.target.value,
                        })
                      }
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="fill">Fill</option>
                    </Select>
                  </label>
                  {selectedNode.id !== "frame-background" &&
                  readString(selectedNode.props.src, "") ? (
                    <ColorKeyControls
                      value={selectedNode.props.colorKey}
                      onChange={(colorKey) =>
                        onUpdateNodeProps(selectedNode.id, { colorKey })
                      }
                    />
                  ) : null}
                </>
              ) : null}

              {selectedNode.type === "photo-slot" ||
              selectedNode.type === "border" ? (
                <>
                  <label className="block text-xs font-medium text-zinc-500">
                    Border color
                    <Input
                      className="mt-1"
                      value={readString(
                        selectedNode.props.borderColor,
                        "#d4d4d8",
                      )}
                      onChange={(event) =>
                        onUpdateNodeProps(selectedNode.id, {
                          borderColor: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-zinc-500">
                      Radius
                      <Input
                        className="mt-1"
                        type="number"
                        value={readNumber(selectedNode.props.radius, 10)}
                        onChange={(event) =>
                          onUpdateNodeProps(selectedNode.id, {
                            radius: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-500">
                      Border
                      <Input
                        className="mt-1"
                        type="number"
                        value={readNumber(
                          selectedNode.props.borderWidth,
                          selectedNode.type === "border" ? 2 : 0,
                        )}
                        onChange={(event) =>
                          onUpdateNodeProps(selectedNode.id, {
                            borderWidth: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
