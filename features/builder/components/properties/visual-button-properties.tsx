"use client";

import { PaintBucket, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ColorField,
  PanelSection,
} from "@/features/builder/components/visual-properties-primitives";
import { PAGE_ROLES, SEMANTIC_ROLES } from "@/features/builder/constants";
import { readNumber, readString } from "@/features/builder/utils";
import { sanitizeSvgMarkup } from "@/features/builder/visual-builder.utils";
import { BUILDER_IMAGE_ACCEPT } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualButtonProperties({
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
      title="Button"
      icon={<PaintBucket className="size-3.5 text-zinc-500" />}
    >
      <ColorField
        label="Button color"
        value={readString(selectedNode.props.background, "#18181b")}
        onChange={(value) =>
          updateNodeProps(selectedNode.id, { background: value })
        }
      />
      <label className="text-xs font-medium text-zinc-500">
        Radius
        <Input
          className="mt-1"
          type="number"
          value={readNumber(selectedNode.props.radius, 6)}
          onChange={(event) =>
            updateNodeProps(selectedNode.id, {
              radius: Number(event.target.value),
            })
          }
        />
      </label>

      <ButtonImageDesign
        selectedNode={selectedNode}
        uploading={uploading}
        onImageUpload={onImageUpload}
        updateNodeProps={updateNodeProps}
      />
      <ButtonSemanticRole
        selectedNode={selectedNode}
        updateNodeProps={updateNodeProps}
      />
      <ButtonSvgIcon
        selectedNode={selectedNode}
        updateNodeProps={updateNodeProps}
      />
    </PanelSection>
  );
}

function ButtonImageDesign({
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
  const src = readString(selectedNode.props.src, "");

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
      <div className="mb-1.5 font-semibold text-zinc-600">
        Custom button design
      </div>
      {src && (
        <div className="mb-2 flex items-center gap-2 rounded border border-zinc-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="button preview"
            className="h-8 w-12 rounded border border-zinc-100 object-contain"
          />
          <span className="flex-1 truncate text-[10px] text-zinc-400">
            Image loaded
          </span>
          <button
            type="button"
            onClick={() => updateNodeProps(selectedNode.id, { src: null })}
            className="text-sm font-bold text-zinc-400 hover:text-red-500"
          >
            x
          </button>
        </div>
      )}
      <label className="block text-zinc-500">
        Source URL
        <Input
          className="mt-0.5 bg-white"
          value={src}
          placeholder="https://..."
          onChange={(event) =>
            updateNodeProps(selectedNode.id, { src: event.target.value })
          }
        />
      </label>
      <label className="mt-1.5 block text-zinc-500">
        Upload image
        <Input
          className="mt-0.5 bg-white"
          type="file"
          accept={BUILDER_IMAGE_ACCEPT}
          disabled={uploading}
          onChange={(event) => {
            onImageUpload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function ButtonSemanticRole({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const pageRoleValues =
    PAGE_ROLES[selectedNode.page as keyof typeof PAGE_ROLES] ?? [];
  const pageRoles = SEMANTIC_ROLES.filter((role) =>
    pageRoleValues.includes(role.value),
  );
  const genericRoles = SEMANTIC_ROLES.filter(
    (role) => role.screen === "generic",
  );

  return (
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
        {pageRoles.length > 0 && (
          <optgroup label={selectedNode.page}>
            {pageRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="generic">
          {genericRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </optgroup>
      </Select>
      <div className="mt-1.5 text-[10px] leading-4 text-zinc-400">
        Flutter maps this role to the correct action handler.
      </div>
    </label>
  );
}

function ButtonSvgIcon({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const iconSvg =
    typeof selectedNode.props.iconSvg === "string"
      ? selectedNode.props.iconSvg
      : "";

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
      <div className="mb-1.5 font-semibold text-zinc-600">Icon (SVG)</div>
      {iconSvg && (
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
              __html: sanitizeSvgMarkup(iconSvg),
            }}
          />
          <span className="flex-1 truncate font-mono text-[10px] text-zinc-400">
            SVG loaded
          </span>
          <button
            type="button"
            onClick={() => updateNodeProps(selectedNode.id, { iconSvg: null })}
            className="text-zinc-400 hover:text-red-500"
          >
            x
          </button>
        </div>
      )}

      <label className="block text-zinc-500">
        Paste SVG markup
        <textarea
          rows={3}
          placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>'
          className="mt-0.5 w-full resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 font-mono text-[10px] text-zinc-700 outline-none focus:border-zinc-400"
          onChange={(event) => {
            const value = sanitizeSvgMarkup(event.target.value.trim());
            if (value) updateNodeProps(selectedNode.id, { iconSvg: value });
          }}
        />
      </label>

      <label className="mt-1 flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-zinc-300 px-2 py-1 text-[10px] text-zinc-500 hover:border-zinc-400 hover:bg-white">
        <Upload className="size-3" />
        Upload .svg file
        <input
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
              const text = sanitizeSvgMarkup(
                String(readerEvent.target?.result ?? "").trim(),
              );
              if (text) {
                updateNodeProps(selectedNode.id, { iconSvg: text });
              }
            };
            reader.readAsText(file);
            event.target.value = "";
          }}
        />
      </label>

      <div className="mt-2 text-zinc-500">
        Position
        <div className="mt-1 flex gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5">
          {(["left", "right", "top", "bottom", "only"] as const).map(
            (position) => (
              <button
                key={position}
                type="button"
                title={
                  position === "only"
                    ? "Icon only (no text)"
                    : `Icon ${position}`
                }
                onClick={() =>
                  updateNodeProps(selectedNode.id, {
                    iconPosition: position,
                  })
                }
                className={cn(
                  "flex flex-1 items-center justify-center rounded py-1 text-[10px] font-medium transition-colors",
                  (selectedNode.props.iconPosition ?? "left") === position
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                {position}
              </button>
            ),
          )}
        </div>
      </div>

      <label className="mt-1.5 block text-zinc-500">
        Icon size (px)
        <Input
          className="mt-0.5"
          type="number"
          min={10}
          max={96}
          value={readNumber(selectedNode.props.iconSize, 20)}
          onChange={(event) =>
            updateNodeProps(selectedNode.id, {
              iconSize: Number(event.target.value),
            })
          }
        />
      </label>
    </div>
  );
}
