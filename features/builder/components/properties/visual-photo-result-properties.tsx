"use client";

import { Grid2X2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import { calculatePhotoResultGrid } from "@/features/builder/visual-builder.utils";
import type { BuilderNode } from "@/types/builder";

export function VisualPhotoResultProperties({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const grid = calculatePhotoResultGrid(selectedNode);

  return (
    <PanelSection
      title="Photo result layout"
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
  );
}
