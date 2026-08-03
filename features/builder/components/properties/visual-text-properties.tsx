"use client";

import { useEffect } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Type,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ColorField,
  PanelSection,
} from "@/features/builder/components/visual-properties-primitives";
import { PAGE_ROLES, SEMANTIC_ROLES } from "@/features/builder/constants";
import { readNumber, readString } from "@/features/builder/utils";
import { cn } from "@/lib/utils";
import type { BuilderCanvas, BuilderNode } from "@/types/builder";

const GOOGLE_FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Outfit", value: "Outfit, sans-serif" },
  { label: "DM Sans", value: "DM Sans, sans-serif" },
  { label: "Nunito", value: "Nunito, sans-serif" },
  { label: "Playfair Display", value: "Playfair Display, serif" },
  { label: "Lora", value: "Lora, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

export function VisualTextProperties({
  canvas,
  selectedNode,
  updateCanvas,
  updateNodeProps,
  section,
}: {
  canvas: BuilderCanvas;
  selectedNode: BuilderNode;
  updateCanvas: (patch: Partial<BuilderCanvas>) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  section?: "content" | "style" | "advanced";
}) {
  const isLiveTextNode =
    selectedNode.type === "camera-timer" ||
    selectedNode.type === "camera-flash" ||
    selectedNode.type === "camera-shot-counter";

  // Reinject custom fonts into <head> on mount and whenever customFonts changes
  // This ensures fonts loaded in a previous session are available after page refresh
  const customFonts = canvas.customFonts ?? [];
  useEffect(() => {
    for (const font of customFonts) {
      const id = `custom-font-${font.name}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = font.url;
        document.head.appendChild(link);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(customFonts)]);

  // content: editable text value
  if (section === "content") {
    if (isLiveTextNode) return null;
    return (
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
            onChange={(event) =>
              updateNodeProps(
                selectedNode.id,
                selectedNode.type === "button"
                  ? { label: event.target.value }
                  : { content: event.target.value },
              )
            }
          />
        </label>
      </PanelSection>
    );
  }

  // style: font, size, weight, color, alignment, style controls
  if (section === "style") {
    return (
      <PanelSection
        title="Text"
        icon={<Type className="size-3.5 text-zinc-500" />}
      >
        {isLiveTextNode && selectedNode.type !== "camera-timer" && (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5 text-[10px] leading-4 text-blue-700">
            Teks ini diisi otomatis oleh kamera saat sesi berjalan. Hanya warna, font, dan ukuran yang bisa diatur.
          </div>
        )}
        <label className="block text-xs font-medium text-zinc-500">
          Font family
          <Select
            className="mt-1"
            value={readString(selectedNode.props.fontFamily, "")}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                fontFamily: event.target.value || "inherit",
              })
            }
          >
            <option value="">System default</option>
            <optgroup label="Google Fonts">
              {GOOGLE_FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </optgroup>
            {(canvas.customFonts ?? []).length > 0 && (
              <optgroup label="Custom fonts">
                {(canvas.customFonts ?? []).map((font) => (
                  <option key={font.name} value={`${font.name}, sans-serif`}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </label>
        <ColorField
          label="Text color"
          value={readString(selectedNode.props.color, "#18181b")}
          onChange={(value) => updateNodeProps(selectedNode.id, { color: value })}
        />
        <TextAlignmentControls
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
        />
        <TextStyleControls
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
        />
        <TextMetricsControls
          selectedNode={selectedNode}
          updateNodeProps={updateNodeProps}
        />
      </PanelSection>
    );
  }

  // advanced: semantic role (Flutter binding) — custom fonts moved to Assets panel
  if (section === "advanced") {
    return (
      <PanelSection
        title="Text"
        icon={<Type className="size-3.5 text-zinc-500" />}
      >
        <div className="rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-2 text-[10px] leading-[1.5] text-zinc-500">
          Kelola custom font di panel <span className="font-semibold text-zinc-700">Assets</span> (sidebar kiri → ikon paket).
        </div>
        {selectedNode.page === "camera" &&
          !isLiveTextNode &&
          selectedNode.type !== "button" && (
          <label className="block text-xs font-medium text-zinc-500">
            <div className="mb-1 flex items-center gap-1.5">
              Semantic Role
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                Flutter binding
              </span>
            </div>
            <Select
              className="mt-0 font-mono text-xs"
              value={readString(selectedNode.props.semanticRole ?? "", "")}
              onChange={(event) =>
                updateNodeProps(selectedNode.id, {
                  semanticRole: event.target.value || null,
                })
              }
            >
              <option value="">unassigned</option>
              <optgroup label="camera">
                {SEMANTIC_ROLES.filter((role) =>
                  PAGE_ROLES.camera.includes(role.value),
                ).map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </optgroup>
            </Select>
          </label>
        )}
      </PanelSection>
    );
  }

  return null;
}

function TextAlignmentControls({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const current = readString(selectedNode.props.textAlign, "left");
  const alignments = [
    { align: "left", icon: <AlignLeft className="size-3.5" /> },
    { align: "center", icon: <AlignCenter className="size-3.5" /> },
    { align: "right", icon: <AlignRight className="size-3.5" /> },
    { align: "justify", icon: <AlignJustify className="size-3.5" /> },
  ] as const;

  return (
    <div className="text-xs font-medium text-zinc-500">
      Alignment
      <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 p-0.5">
        {alignments.map(({ align, icon }) => (
          <button
            key={align}
            type="button"
            onClick={() => updateNodeProps(selectedNode.id, { textAlign: align })}
            className={cn(
              "flex flex-1 items-center justify-center rounded py-1 transition-colors",
              current === align
                ? "bg-zinc-950 text-white"
                : "text-zinc-500 hover:bg-zinc-100",
            )}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextStyleControls({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-md border border-zinc-200 p-0.5">
      <button
        type="button"
        title="Bold"
        onClick={() =>
          updateNodeProps(selectedNode.id, {
            fontWeight:
              readNumber(selectedNode.props.fontWeight, 400) >= 700 ? 400 : 700,
          })
        }
        className={cn(
          "flex flex-1 items-center justify-center rounded py-1 text-xs font-bold transition-colors",
          readNumber(selectedNode.props.fontWeight, 400) >= 700
            ? "bg-zinc-950 text-white"
            : "text-zinc-500 hover:bg-zinc-100",
        )}
      >
        B
      </button>
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
  );
}

function TextMetricsControls({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  return (
    <>
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
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
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
            value={readNumber(
              selectedNode.props.fontWeight,
              selectedNode.type === "button" ? 600 : 500,
            )}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                fontWeight: Number(event.target.value),
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
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                letterSpacing:
                  event.target.value === "" ? null : Number(event.target.value),
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
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                lineHeight:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
        </label>
      </div>

      {selectedNode.page === "camera" &&
        selectedNode.type !== "camera-timer" &&
        selectedNode.type !== "camera-flash" &&
        selectedNode.type !== "camera-shot-counter" && (
        <label className="block text-xs font-medium text-zinc-500">
          <div className="mb-1 flex items-center gap-1.5">
            Semantic Role
            <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
              Flutter binding
            </span>
          </div>

          <Select
            className="mt-0 font-mono text-xs"
            value={readString(selectedNode.props.semanticRole ?? "", "")}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                semanticRole: event.target.value || null,
              })
            }
          >
            <option value="">unassigned</option>

            <optgroup label="camera">
              {SEMANTIC_ROLES.filter((role) =>
                PAGE_ROLES.camera.includes(role.value),
              ).map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </optgroup>
          </Select>
        </label>
      )}
    </>
  );
}
