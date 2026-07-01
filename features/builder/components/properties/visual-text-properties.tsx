"use client";

import { useState } from "react";
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
}: {
  canvas: BuilderCanvas;
  selectedNode: BuilderNode;
  updateCanvas: (patch: Partial<BuilderCanvas>) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const [fontName, setFontName] = useState("");
  const [fontUrl, setFontUrl] = useState("");
  const customFonts = canvas.customFonts ?? [];

  const loadCustomFont = () => {
    const name = fontName.trim();
    const url = fontUrl.trim();
    if (!name || !url) return;

    const id = `custom-font-${name}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }

    if (!customFonts.find((font) => font.name === name)) {
      updateCanvas({ customFonts: [...customFonts, { name, url }] });
    }
    setFontName("");
    setFontUrl("");
  };

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
          {customFonts.length > 0 && (
            <optgroup label="Custom fonts">
              {customFonts.map((font) => (
                <option key={font.name} value={`'${font.name}', sans-serif`}>
                  {font.name}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </label>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
        <div className="mb-1.5 font-semibold text-zinc-600">
          Import custom font
        </div>
        <label className="block text-zinc-500">
          Font name
          <Input
            className="mt-0.5"
            placeholder="e.g. MyBrand"
            value={fontName}
            onChange={(event) => setFontName(event.target.value)}
          />
        </label>
        <label className="mt-1 block text-zinc-500">
          CSS URL (Google Fonts / CDN)
          <Input
            className="mt-0.5"
            placeholder="https://fonts.googleapis.com/css2?family=..."
            value={fontUrl}
            onChange={(event) => setFontUrl(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={loadCustomFont}
          className="mt-1.5 w-full rounded bg-zinc-800 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Load font
        </button>
        {customFonts.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {customFonts.map((font) => (
              <div
                key={font.name}
                className="flex items-center justify-between rounded bg-white px-1.5 py-0.5 text-[10px] text-zinc-600"
              >
                <span style={{ fontFamily: `'${font.name}', sans-serif` }}>
                  {font.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateCanvas({
                      customFonts: customFonts.filter(
                        (item) => item.name !== font.name,
                      ),
                    })
                  }
                  className="text-zinc-400 hover:text-red-500"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
      <ColorField
        label={selectedNode.type === "button" ? "Text color" : "Color"}
        value={readString(
          selectedNode.props.color,
          selectedNode.type === "button" ? "#ffffff" : "#18181b",
        )}
        onChange={(value) => updateNodeProps(selectedNode.id, { color: value })}
      />
    </PanelSection>
  );
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
  );
}
