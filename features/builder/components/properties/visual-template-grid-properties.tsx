"use client";

import { Grid2X2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import { calculateTemplateGrid } from "@/features/builder/visual-builder.utils";
import type { BuilderNode } from "@/types/builder";

export function VisualTemplateGridProperties({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const grid = calculateTemplateGrid(selectedNode);
  const templateLayout = readString(selectedNode.props.templateLayout, "auto");
  const manualColumns = readNumber(selectedNode.props.templateColumns, 0);
  const autoMinTileActive = templateLayout === "auto" && manualColumns <= 0;

  return (
    <PanelSection
      title="Template grid layout"
      icon={<Grid2X2 className="size-3.5 text-zinc-500" />}
    >
      <div className="rounded-lg border border-orange-100 bg-orange-50/70 p-2 text-xs text-orange-800">
        <div className="font-semibold">
          Preview: {grid.rows} rows x {grid.columns} columns
        </div>
        <div className="mt-0.5 text-[10px] leading-4 text-orange-700/80">
          Auto follows available width. Use manual columns to lock the template
          grid shape.
        </div>
      </div>

      <label className="block text-xs font-medium text-zinc-500">
        Layout
        <Select
          className="mt-1"
          value={templateLayout}
          onChange={(event) =>
            updateNodeProps(selectedNode.id, {
              templateLayout: event.target.value,
              templateColumns: 0,
            })
          }
        >
          <option value="auto">Auto by width</option>
          <option value="row">Force 1 row</option>
          <option value="column">Force 1 column</option>
          <option value="grid">Force balanced grid</option>
        </Select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          Sample tile count
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={24}
            value={readNumber(selectedNode.props.tileCount, 4)}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                tileCount: Number(event.target.value),
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
            max={24}
            value={readNumber(selectedNode.props.templateColumns, 0)}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                templateColumns: Number(event.target.value),
              })
            }
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          Gap
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={80}
            value={readNumber(selectedNode.props.templateGap, 8)}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                templateGap: Number(event.target.value),
              })
            }
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Auto min tile
          <Input
            className="mt-1"
            type="number"
            min={80}
            max={800}
            value={readNumber(selectedNode.props.minTileWidth, 280)}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                minTileWidth: Number(event.target.value),
                templateLayout: "auto",
                templateColumns: 0,
              })
            }
          />
        </label>
      </div>
      <div className="text-[10px] leading-4 text-zinc-400">
        {autoMinTileActive
          ? "Auto min tile is a breakpoint: it changes the column count when the area can no longer fit another tile."
          : "Auto min tile is ignored while manual columns or a forced layout is active. Editing it switches back to Auto."}
      </div>
      <div className="text-[10px] leading-4 text-zinc-400">
        Tile count is only a preview sample. The Flutter kiosk uses real
        templates and scrolls inside this grid when there are more items.
      </div>
    </PanelSection>
  );
}
