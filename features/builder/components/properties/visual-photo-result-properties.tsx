"use client";

import { Grid2X2, LayoutTemplate } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import { calculatePhotoResultGrid } from "@/features/builder/visual-builder.utils";
import { cn } from "@/lib/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualPhotoResultProperties({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const mode = readString(selectedNode.props.photoResultMode, "grid");
  const grid = calculatePhotoResultGrid(selectedNode);

  return (
    <>
      {/* Mode selector — always shown */}
      <PanelSection
        title="Display mode"
        icon={<LayoutTemplate className="size-3.5 text-zinc-500" />}
      >
        <div className="flex gap-1.5">
          {(["grid", "frame"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() =>
                updateNodeProps(selectedNode.id, { photoResultMode: m })
              }
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg border p-2.5 text-[10px] font-semibold transition-colors",
                mode === m
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-zinc-200 text-zinc-400 hover:bg-zinc-50",
              )}
            >
              {m === "grid" ? (
                <Grid2X2 className="size-4" />
              ) : (
                <LayoutTemplate className="size-4" />
              )}
              {m === "grid" ? "Grid" : "Frame View"}
            </button>
          ))}
        </div>
        {mode === "frame" && (
          <div className="rounded-md border border-teal-100 bg-teal-50 px-2.5 py-2 text-[10px] leading-[1.5] text-teal-800">
            Foto hasil capture akan masuk satu per satu ke slot frame yang dipilih. Slot yang belum terisi tampil kosong putih. Frame disesuaikan dengan ukuran node menggunakan BoxFit.contain — ratio frame tidak berubah.
          </div>
        )}
      </PanelSection>

      {/* Grid layout options — only shown in grid mode */}
      {mode === "grid" && (
        <PanelSection
          title="Grid layout"
          icon={<Grid2X2 className="size-3.5 text-zinc-500" />}
        >
          <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-2 text-xs text-teal-800">
            <div className="font-semibold">
              Preview: {grid.rows} rows x {grid.columns} columns
            </div>
            <div className="mt-0.5 text-[10px] leading-4 text-teal-700/80">
              Auto follows the slot shape: wide becomes one row, tall becomes one
              column, and square becomes a balanced grid.
            </div>
          </div>

          <label className="block text-xs font-medium text-zinc-500">
            Layout
            <Select
              className="mt-1"
              value={readString(selectedNode.props.photoLayout, "auto")}
              onChange={(event) =>
                updateNodeProps(selectedNode.id, {
                  photoLayout: event.target.value,
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
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, {
                    samplePhotoCount: Number(event.target.value),
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
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, {
                    photoColumns: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className="text-[10px] leading-4 text-zinc-400">
            Use 0 manual columns to keep automatic layout.
          </div>
        </PanelSection>
      )}
    </>
  );
}
