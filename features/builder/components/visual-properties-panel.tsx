"use client";

import { useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Copy,
  Grid2X2,
  Image as ImageIcon,
  Link2,
  Move,
  PaintBucket,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ColorField,
  PanelSection,
} from "@/features/builder/components/visual-properties-primitives";
import { PAGE_ROLES, SEMANTIC_ROLES } from "@/features/builder/constants";
import {
  isEditableTextNode,
  isMediaNode,
  readNumber,
  readString,
} from "@/features/builder/utils";
import { uploadBuilderImage } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderNode } from "@/types/builder";
import {
  calculatePhotoResultGrid,
  sanitizeSvgMarkup,
} from "@/features/builder/visual-builder.utils";

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
  const isOverlayMode = !!canvas.overlayMode;
  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file?: File) => {
    if (!selectedNode || !file) return;

    setUploading(true);
    try {
      const image = await uploadBuilderImage(file);
      updateNodeProps(selectedNode.id, { src: image.url, alt: file.name });
      toast.success("Image uploaded to Supabase Storage");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload image",
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

  return (
    <div className="space-y-2">
      {/* Node header */}
      <div className="flex items-center justify-between py-1">
        <div>
          <div className="text-sm font-semibold capitalize">
            {selectedNode.type}
          </div>
          <div className="text-[10px] font-mono text-zinc-400">
            {selectedNode.id}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => duplicateNode(selectedNode.id)}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteNode(selectedNode.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Transform */}
      <PanelSection
        title="Transform"
        icon={<Move className="size-3.5 text-zinc-500" />}
      >
        {/* X / Y */}
        <div className="grid grid-cols-2 gap-2">
          {(["x", "y"] as const).map((key) => (
            <label key={key} className="text-xs font-medium text-zinc-500">
              {key.toUpperCase()}
              <Input
                className="mt-1"
                type="number"
                value={selectedNode[key]}
                onChange={(e) =>
                  updateNode(selectedNode.id, { [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        {/* W / [lock] / H inline */}
        <div className="flex items-end gap-1">
          <label className="flex-1 text-xs font-medium text-zinc-500">
            W
            <Input
              className="mt-1"
              type="number"
              value={selectedNode.width}
              onChange={(e) => {
                const w = Number(e.target.value);
                const h = selectedNode.lockAspect
                  ? Math.round(w * (selectedNode.height / selectedNode.width))
                  : selectedNode.height;
                updateNode(selectedNode.id, { width: w, height: h });
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
              onChange={(e) => {
                const h = Number(e.target.value);
                const w = selectedNode.lockAspect
                  ? Math.round(h * (selectedNode.width / selectedNode.height))
                  : selectedNode.width;
                updateNode(selectedNode.id, { width: w, height: h });
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
            onChange={(e) =>
              updateNode(selectedNode.id, { opacity: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Rotation
          <Input
            className="mt-1"
            type="number"
            value={selectedNode.rotation}
            onChange={(e) =>
              updateNode(selectedNode.id, { rotation: Number(e.target.value) })
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

      {/* Text */}
      {editableText && !isOverlayMode && (
        <PanelSection
          title="Text"
          icon={<Type className="size-3.5 text-zinc-500" />}
        >
          <label className="block text-xs font-medium text-zinc-500">
            Content
            <Input
              className="mt-1"
              value={readString(
                selectedNode.props.content,
                readString(selectedNode.props.label, ""),
              )}
              onChange={(e) =>
                updateNodeProps(
                  selectedNode.id,
                  selectedNode.type === "button"
                    ? { label: e.target.value }
                    : { content: e.target.value },
                )
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Font family
            <Select
              className="mt-1"
              value={readString(
                selectedNode.props.fontFamily as string | undefined,
                "",
              )}
              onChange={(e) =>
                updateNodeProps(selectedNode.id, {
                  fontFamily: e.target.value || "inherit",
                })
              }
            >
              <option value="">System default</option>
              <optgroup label="Google Fonts">
                <option value="Inter, sans-serif">Inter</option>
                <option value="Outfit, sans-serif">Outfit</option>
                <option value="DM Sans, sans-serif">DM Sans</option>
                <option value="Nunito, sans-serif">Nunito</option>
                <option value="Playfair Display, serif">
                  Playfair Display
                </option>
                <option value="Lora, serif">Lora</option>
                <option value="'Courier New', monospace">Courier New</option>
              </optgroup>
              {(canvas.customFonts ?? []).length > 0 && (
                <optgroup label="Custom fonts">
                  {(canvas.customFonts ?? []).map((cf) => (
                    <option key={cf.name} value={`'${cf.name}', sans-serif`}>
                      {cf.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </label>
          {/* Custom font import */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
            <div className="mb-1.5 font-semibold text-zinc-600">
              🔗 Import custom font
            </div>
            <label className="block text-zinc-500">
              Font name
              <Input
                className="mt-0.5"
                placeholder="e.g. MyBrand"
                id="custom-font-name"
              />
            </label>
            <label className="mt-1 block text-zinc-500">
              CSS URL (Google Fonts / CDN)
              <Input
                className="mt-0.5"
                placeholder="https://fonts.googleapis.com/css2?family=..."
                id="custom-font-url"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const nameEl = document.getElementById(
                  "custom-font-name",
                ) as HTMLInputElement | null;
                const urlEl = document.getElementById(
                  "custom-font-url",
                ) as HTMLInputElement | null;
                const name = nameEl?.value.trim();
                const url = urlEl?.value.trim();
                if (!name || !url) return;
                // Inject <link> tag to load the font
                const id = `custom-font-${name}`;
                if (!document.getElementById(id)) {
                  const link = document.createElement("link");
                  link.id = id;
                  link.rel = "stylesheet";
                  link.href = url;
                  document.head.appendChild(link);
                }
                // Save to canvas
                const existing = canvas.customFonts ?? [];
                if (!existing.find((f) => f.name === name)) {
                  updateCanvas({ customFonts: [...existing, { name, url }] });
                }
                if (nameEl) nameEl.value = "";
                if (urlEl) urlEl.value = "";
              }}
              className="mt-1.5 w-full rounded bg-zinc-800 py-1 text-[10px] font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              + Load font
            </button>
            {(canvas.customFonts ?? []).length > 0 && (
              <div className="mt-2 space-y-0.5">
                {(canvas.customFonts ?? []).map((cf) => (
                  <div
                    key={cf.name}
                    className="flex items-center justify-between rounded bg-white px-1.5 py-0.5 text-[10px] text-zinc-600"
                  >
                    <span style={{ fontFamily: `'${cf.name}', sans-serif` }}>
                      {cf.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCanvas({
                          customFonts: (canvas.customFonts ?? []).filter(
                            (f) => f.name !== cf.name,
                          ),
                        })
                      }
                      className="text-zinc-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs font-medium text-zinc-500">
            Alignment
            <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 p-0.5">
              {(
                [
                  { align: "left", icon: <AlignLeft className="size-3.5" /> },
                  {
                    align: "center",
                    icon: <AlignCenter className="size-3.5" />,
                  },
                  { align: "right", icon: <AlignRight className="size-3.5" /> },
                  {
                    align: "justify",
                    icon: <AlignJustify className="size-3.5" />,
                  },
                ] as const
              ).map(({ align, icon }) => {
                const current = readString(
                  selectedNode.props.textAlign as string | undefined,
                  "left",
                );
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() =>
                      updateNodeProps(selectedNode.id, { textAlign: align })
                    }
                    className={cn(
                      "flex flex-1 items-center justify-center rounded py-1 transition-colors",
                      current === align
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-500 hover:bg-zinc-100",
                    )}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
            {/* Bold / Italic / Underline */}
            <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 p-0.5">
              {(
                [
                  {
                    key: "fontWeight",
                    onVal: 700,
                    offVal: 400,
                    label: "B",
                    title: "Bold",
                    cls: "font-bold",
                  },
                ] as const
              ).map(({ key, onVal, offVal, label, title, cls }) => (
                <button
                  key={key}
                  type="button"
                  title={title}
                  onClick={() =>
                    updateNodeProps(selectedNode.id, {
                      [key]:
                        readNumber(selectedNode.props[key], 400) >= 700
                          ? offVal
                          : onVal,
                    })
                  }
                  className={cn(
                    "flex flex-1 items-center justify-center rounded py-1 text-xs transition-colors",
                    cls,
                    readNumber(selectedNode.props.fontWeight, 400) >= 700
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-500 hover:bg-zinc-100",
                  )}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                title="Italic"
                onClick={() =>
                  updateNodeProps(selectedNode.id, {
                    fontItalic: !selectedNode.props.fontItalic,
                  })
                }
                className={cn(
                  "flex flex-1 items-center justify-center rounded py-1 text-xs italic transition-colors",
                  selectedNode.props.fontItalic
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                I
              </button>
              <button
                type="button"
                title="Underline"
                onClick={() =>
                  updateNodeProps(selectedNode.id, {
                    fontUnderline: !selectedNode.props.fontUnderline,
                  })
                }
                className={cn(
                  "flex flex-1 items-center justify-center rounded py-1 text-xs underline transition-colors",
                  selectedNode.props.fontUnderline
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                U
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">
              Font size
              <Input
                className="mt-1"
                type="number"
                value={readNumber(
                  selectedNode.props.fontSize,
                  selectedNode.type === "button" ? 14 : 18,
                )}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    fontSize: Number(e.target.value),
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
                value={readNumber(
                  selectedNode.props.fontWeight,
                  selectedNode.type === "button" ? 600 : 500,
                )}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    fontWeight: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Letter spacing
              <Input
                className="mt-1"
                type="number"
                step={0.5}
                placeholder="0"
                value={
                  selectedNode.props.letterSpacing != null
                    ? String(selectedNode.props.letterSpacing)
                    : ""
                }
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    letterSpacing:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Line height
              <Input
                className="mt-1"
                type="number"
                step={0.1}
                placeholder="1.4"
                value={
                  selectedNode.props.lineHeight != null
                    ? String(selectedNode.props.lineHeight)
                    : ""
                }
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    lineHeight:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <ColorField
            label={selectedNode.type === "button" ? "Text color" : "Color"}
            value={readString(
              selectedNode.props.color,
              selectedNode.type === "button" ? "#ffffff" : "#18181b",
            )}
            onChange={(v) => updateNodeProps(selectedNode.id, { color: v })}
          />
        </PanelSection>
      )}

      {/* Button */}
      {selectedNode.type === "button" && (
        <PanelSection
          title="Button"
          icon={<PaintBucket className="size-3.5 text-zinc-500" />}
        >
          <ColorField
            label="Button color"
            value={readString(selectedNode.props.background, "#18181b")}
            onChange={(v) =>
              updateNodeProps(selectedNode.id, { background: v })
            }
          />
          <label className="text-xs font-medium text-zinc-500">
            Radius
            <Input
              className="mt-1"
              type="number"
              value={readNumber(selectedNode.props.radius, 6)}
              onChange={(e) =>
                updateNodeProps(selectedNode.id, {
                  radius: Number(e.target.value),
                })
              }
            />
          </label>

          {/* Custom image background / design */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
            <div className="mb-1.5 font-semibold text-zinc-600">
              🖼 Custom Button Design (Canva/Image)
            </div>
            {readString(selectedNode.props.src, "") && (
              <div className="mb-2 flex items-center gap-2 rounded border border-zinc-200 bg-white p-2">
                <img
                  src={readString(selectedNode.props.src, "")}
                  alt="button preview"
                  className="h-8 w-12 object-contain rounded border border-zinc-100"
                />
                <span className="flex-1 truncate text-[10px] text-zinc-400">
                  Image loaded
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateNodeProps(selectedNode.id, { src: null })
                  }
                  className="text-zinc-400 hover:text-red-500 text-sm font-bold"
                >
                  ×
                </button>
              </div>
            )}
            <label className="block text-zinc-500">
              Source URL
              <Input
                className="mt-0.5 bg-white"
                value={readString(selectedNode.props.src, "")}
                placeholder="https://..."
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, { src: e.target.value })
                }
              />
            </label>
            <label className="mt-1.5 block text-zinc-500">
              Upload image
              <Input
                className="mt-0.5 bg-white"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                disabled={uploading}
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-zinc-500">
            <div className="mb-1 flex items-center gap-1.5">
              Semantic Role
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                Flutter binding
              </span>
            </div>
            <Select
              className="mt-0 font-mono text-xs"
              value={readString(
                (selectedNode.props.semanticRole as string | undefined) ?? "",
                "",
              )}
              onChange={(e) =>
                updateNodeProps(selectedNode.id, {
                  semanticRole: e.target.value || null,
                })
              }
            >
              <option value="">— unassigned —</option>
              {(() => {
                const pageRoleValues =
                  PAGE_ROLES[selectedNode.page as keyof typeof PAGE_ROLES] ??
                  [];
                const pageRoles = SEMANTIC_ROLES.filter((r) =>
                  pageRoleValues.includes(r.value),
                );
                const genericRoles = SEMANTIC_ROLES.filter(
                  (r) => r.screen === "generic",
                );
                return (
                  <>
                    {pageRoles.length > 0 && (
                      <optgroup label={`📄 ${selectedNode.page}`}>
                        {pageRoles.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="generic">
                      {genericRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </optgroup>
                  </>
                );
              })()}
            </Select>
            <div className="mt-1.5 text-[10px] leading-4 text-zinc-400">
              Flutter maps this role to the correct action handler.
            </div>
          </label>
          {/* SVG Icon */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
            <div className="mb-1.5 font-semibold text-zinc-600">
              🎨 Icon (SVG)
            </div>
            {/* Preview */}
            {typeof selectedNode.props.iconSvg === "string" &&
              selectedNode.props.iconSvg && (
                <div className="mb-2 flex items-center gap-2 rounded border border-zinc-200 bg-white p-2">
                  <span
                    className="shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: readString(selectedNode.props.color, "#ffffff"),
                    }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeSvgMarkup(
                        selectedNode.props.iconSvg as string,
                      ),
                    }}
                  />
                  <span className="flex-1 truncate font-mono text-[10px] text-zinc-400">
                    SVG loaded
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateNodeProps(selectedNode.id, { iconSvg: null })
                    }
                    className="text-zinc-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              )}
            {/* Paste SVG */}
            <label className="block text-zinc-500">
              Paste SVG markup
              <textarea
                rows={3}
                placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>'
                className="mt-0.5 w-full resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 font-mono text-[10px] text-zinc-700 outline-none focus:border-zinc-400"
                onChange={(e) => {
                  const val = sanitizeSvgMarkup(e.target.value.trim());
                  if (val) updateNodeProps(selectedNode.id, { iconSvg: val });
                }}
              />
            </label>
            {/* Upload .svg file */}
            <label className="mt-1 flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-zinc-300 px-2 py-1 text-[10px] text-zinc-500 hover:border-zinc-400 hover:bg-white">
              <Upload className="size-3" />
              Upload .svg file
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = sanitizeSvgMarkup(
                      String(ev.target?.result ?? "").trim(),
                    );
                    if (text) {
                      updateNodeProps(selectedNode.id, {
                        iconSvg: text,
                      });
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
            </label>
            {/* Icon position */}
            <div className="mt-2 text-zinc-500">
              Position
              <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5">
                {(["left", "right", "top", "bottom", "only"] as const).map(
                  (pos) => (
                    <button
                      key={pos}
                      type="button"
                      title={
                        pos === "only" ? "Icon only (no text)" : `Icon ${pos}`
                      }
                      onClick={() =>
                        updateNodeProps(selectedNode.id, { iconPosition: pos })
                      }
                      className={cn(
                        "flex flex-1 items-center justify-center rounded py-1 text-[10px] font-medium transition-colors",
                        (selectedNode.props.iconPosition ?? "left") === pos
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-500 hover:bg-zinc-100",
                      )}
                    >
                      {pos === "left"
                        ? "◄ T"
                        : pos === "right"
                          ? "T ►"
                          : pos === "top"
                            ? "▲"
                            : pos === "bottom"
                              ? "▼"
                              : "●"}
                    </button>
                  ),
                )}
              </div>
              <div className="mt-0.5 text-[9px] text-zinc-400">
                ◄T left   T► right   ▲ top   ▼ bottom   ● icon only
              </div>
            </div>
            {/* Icon size */}
            <label className="mt-1.5 block text-zinc-500">
              Icon size (px)
              <Input
                className="mt-0.5"
                type="number"
                min={10}
                max={96}
                value={readNumber(selectedNode.props.iconSize, 20)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    iconSize: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
        </PanelSection>
      )}

      {/* Image */}
      {mediaNode && (
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
              onChange={(e) =>
                updateNodeProps(selectedNode.id, { src: e.target.value })
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
              onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">
              Fit
              <Select
                className="mt-1"
                value={readString(selectedNode.props.objectFit, "cover")}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    objectFit: e.target.value,
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
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    radius: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          {uploading && (
            <div className="text-xs text-zinc-500">Uploading image...</div>
          )}
        </PanelSection>
      )}

      {selectedNode.type === "photo-result" && (
        <PanelSection
          title="Photo result layout"
          icon={<Grid2X2 className="size-3.5 text-zinc-500" />}
        >
          {(() => {
            const grid = calculatePhotoResultGrid(selectedNode);
            return (
              <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-2 text-xs text-teal-800">
                <div className="font-semibold">
                  Preview: {grid.rows} baris × {grid.columns} kolom
                </div>
                <div className="mt-0.5 text-[10px] leading-4 text-teal-700/80">
                  Auto akan mengikuti bentuk slot: lebar → 1×{grid.count},
                  tinggi → {grid.count}×1, kotak → grid.
                </div>
              </div>
            );
          })()}

          <label className="block text-xs font-medium text-zinc-500">
            Layout
            <Select
              className="mt-1"
              value={readString(selectedNode.props.photoLayout, "auto")}
              onChange={(e) =>
                updateNodeProps(selectedNode.id, {
                  photoLayout: e.target.value,
                  photoColumns: 0,
                })
              }
            >
              <option value="auto">Auto by slot shape</option>
              <option value="row">Force 1 row</option>
              <option value="column">Force 1 column</option>
              <option value="grid">Force balanced grid</option>
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-zinc-500">
              Sample photos
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={12}
                value={readNumber(selectedNode.props.samplePhotoCount, 4)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    samplePhotoCount: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Manual columns
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={12}
                value={readNumber(selectedNode.props.photoColumns, 0)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    photoColumns: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className="text-[10px] leading-4 text-zinc-400">
            Isi 0 pada manual columns untuk memakai pilihan layout otomatis.
          </div>
        </PanelSection>
      )}

      {/* Generic color/radius for non-text, non-media nodes */}
      {!editableText &&
        !mediaNode &&
        selectedNode.type !== "return-countdown" &&
        selectedNode.type !== "qr" &&
        selectedNode.type !== "qr-placeholder" &&
        selectedNode.type !== "qr-link" && (
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
                  onChange={(e) =>
                    updateNodeProps(selectedNode.id, { color: e.target.value })
                  }
                />
              </label>
              <label className="text-xs font-medium text-zinc-500">
                Radius
                <Input
                  className="mt-1"
                  type="number"
                  value={readNumber(selectedNode.props.radius, 6)}
                  onChange={(e) =>
                    updateNodeProps(selectedNode.id, {
                      radius: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          </PanelSection>
        )}

      {/* QR Code and Link Styling */}
      {(selectedNode.type === "qr" ||
        selectedNode.type === "qr-placeholder" ||
        selectedNode.type === "qr-link") && (
        <PanelSection
          title={selectedNode.type === "qr-link" ? "QR Link" : "QR Code"}
          icon={<Grid2X2 className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-3">
            {selectedNode.type !== "qr-link" && (
              <ColorField
                label="QR Color"
                value={readString(selectedNode.props.qrColor, "#000000")}
                onChange={(v) =>
                  updateNodeProps(selectedNode.id, { qrColor: v })
                }
              />
            )}
            <ColorField
              label="QR Background"
              value={readString(selectedNode.props.qrBgColor, "#ffffff")}
              onChange={(v) =>
                updateNodeProps(selectedNode.id, { qrBgColor: v })
              }
            />
            {selectedNode.type !== "qr-link" && (
              <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
                <div>
                  <span className="block text-xs font-medium text-zinc-700">
                    Transparent background
                  </span>
                  <span className="block text-[10px] text-zinc-400">
                    Use no background behind the download QR container.
                  </span>
                </div>
                <Switch
                  checked={selectedNode.props.qrTransparentBackground === true}
                  onCheckedChange={(v) =>
                    updateNodeProps(selectedNode.id, {
                      qrTransparentBackground: v,
                    })
                  }
                />
              </label>
            )}
            {(selectedNode.type === "qr-link" ||
              selectedNode.props.showQrLink !== false) && (
              <ColorField
                label="QR Link Text Color"
                value={readString(
                  selectedNode.props.qrTextColor ?? selectedNode.props.color,
                  selectedNode.type === "qr-link" ? "#3b82f6" : "#27272a",
                )}
                onChange={(v) =>
                  updateNodeProps(selectedNode.id, { qrTextColor: v, color: v })
                }
              />
            )}
            <label className="block text-xs font-medium text-zinc-500">
              Radius (Rounded)
              <Input
                className="mt-1"
                type="number"
                value={readNumber(
                  selectedNode.props.radius,
                  selectedNode.type === "qr-link" ? 6 : 12,
                )}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    radius: Number(e.target.value),
                  })
                }
              />
            </label>
            {selectedNode.type !== "qr-link" && (
              <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
                <div>
                  <span className="block text-xs font-medium text-zinc-700">
                    Show QR Link
                  </span>
                  <span className="block text-[10px] text-zinc-400">
                    Display the text link below the QR code.
                  </span>
                </div>
                <Switch
                  checked={selectedNode.props.showQrLink !== false}
                  onCheckedChange={(v) =>
                    updateNodeProps(selectedNode.id, { showQrLink: v })
                  }
                />
              </label>
            )}
            {selectedNode.type === "qr" && (
              <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
                <div>
                  <span className="block text-xs font-medium text-zinc-700">
                    Show Share Button
                  </span>
                  <span className="block text-[10px] text-zinc-400">
                    Display a small share icon on the QR corner.
                  </span>
                </div>
                <Switch
                  checked={selectedNode.props.showShareButton === true}
                  onCheckedChange={(v) =>
                    updateNodeProps(selectedNode.id, { showShareButton: v })
                  }
                />
              </label>
            )}
          </div>
        </PanelSection>
      )}

      {/* Session Countdown */}
      {selectedNode.type === "session-countdown" && (
        <PanelSection
          title="Session Countdown"
          icon={<span className="text-sm">⏱</span>}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Label
              <Input
                className="mt-1"
                value={readString(selectedNode.props.label, "Session ends in")}
                placeholder="Session ends in"
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, { label: e.target.value })
                }
              />
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selectedNode.props.useGlobal !== false}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    useGlobal: e.target.checked,
                  })
                }
              />
              <span>
                Use device/global value
                <span className="block text-[10px] text-zinc-400">
                  When checked, Flutter reads the device&apos;s
                  `session_countdown_seconds` (or app_config fallback).
                </span>
              </span>
            </label>
            <label className="block">
              Override duration (seconds)
              <Input
                className="mt-1"
                type="number"
                min={30}
                max={1800}
                disabled={selectedNode.props.useGlobal !== false}
                value={readNumber(selectedNode.props.countdownSeconds, 300)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    countdownSeconds: Number(e.target.value),
                  })
                }
              />
            </label>
            <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-600 leading-4">
              <strong>Flutter:</strong> total time across template → camera →
              preview → thanks. When the timer hits 0, the app auto-returns to
              Landing.
            </div>
          </div>
        </PanelSection>
      )}

      {/* Payment Countdown */}
      {selectedNode.type === "payment-countdown" && (
        <PanelSection
          title="Payment Countdown"
          icon={<span className="text-sm">💳</span>}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Label
              <Input
                className="mt-1"
                value={readString(selectedNode.props.label, "Pay within")}
                placeholder="Pay within"
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, { label: e.target.value })
                }
              />
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selectedNode.props.useGlobal !== false}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    useGlobal: e.target.checked,
                  })
                }
              />
              <span>
                Use device/global value
                <span className="block text-[10px] text-zinc-400">
                  When checked, Flutter reads the device&apos;s
                  `payment_countdown_seconds`.
                </span>
              </span>
            </label>
            <label className="block">
              Override duration (seconds)
              <Input
                className="mt-1"
                type="number"
                min={10}
                max={600}
                disabled={selectedNode.props.useGlobal !== false}
                value={readNumber(selectedNode.props.countdownSeconds, 60)}
                onChange={(e) =>
                  updateNodeProps(selectedNode.id, {
                    countdownSeconds: Number(e.target.value),
                  })
                }
              />
            </label>
            <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-700 leading-4">
              <strong>Flutter:</strong> when the QRIS payment timer reaches 0,
              the payment dialog cancels and returns to Landing.
            </div>
          </div>
        </PanelSection>
      )}
    </div>
  );
}
