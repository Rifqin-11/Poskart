"use client";

import { Grid2X2, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ColorField,
  PanelSection,
} from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import { calculateTemplateGrid } from "@/features/builder/visual-builder.utils";
import type { BuilderNode } from "@/types/builder";

export function VisualTemplateGridProperties({
  selectedNode,
  updateNodeProps,
  section,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  section?: "content" | "style" | "advanced";
}) {
  const grid = calculateTemplateGrid(selectedNode);
  const templateLayout = readString(selectedNode.props.templateLayout, "auto");
  const manualColumns = readNumber(selectedNode.props.templateColumns, 0);
  const autoMinTileActive = templateLayout === "auto" && manualColumns <= 0;

  // content: grid layout controls
  if (section === "content") {
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
              max={8}
              value={manualColumns}
              onChange={(event) =>
                updateNodeProps(selectedNode.id, {
                  templateColumns: Number(event.target.value),
                })
              }
            />
          </label>
        </div>

        {autoMinTileActive && (
          <label className="text-xs font-medium text-zinc-500">
            Min tile width (px)
            <Input
              className="mt-1"
              type="number"
              min={60}
              max={400}
              value={readNumber(selectedNode.props.minTileWidth, 120)}
              onChange={(event) =>
                updateNodeProps(selectedNode.id, {
                  minTileWidth: Number(event.target.value),
                })
              }
            />
          </label>
        )}

        <label className="text-xs font-medium text-zinc-500">
          Tile gap (px)
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={40}
            value={readNumber(selectedNode.props.tileGap, 8)}
            onChange={(event) =>
              updateNodeProps(selectedNode.id, {
                tileGap: Number(event.target.value),
              })
            }
          />
        </label>
      </PanelSection>
    );
  }

  // style: card colors
  if (section === "style") {
    return (
      <PanelSection
        title="Template colors"
        icon={<Palette className="size-3.5 text-zinc-500" />}
      >
        <ColorField
          label="Card background"
          value={readString(selectedNode.props.cardColor, "#FFFFFF")}
          onChange={(value) =>
            updateNodeProps(selectedNode.id, { cardColor: value })
          }
        />
        <ColorField
          label="Selected card"
          value={readString(selectedNode.props.activeCardColor, "#18181B")}
          onChange={(value) =>
            updateNodeProps(selectedNode.id, { activeCardColor: value })
          }
        />
        <ColorField
          label="Check icon"
          value={readString(selectedNode.props.checkColor, "#2F80ED")}
          onChange={(value) =>
            updateNodeProps(selectedNode.id, { checkColor: value })
          }
        />
        <div className="text-[10px] leading-4 text-zinc-400">
          Warna kartu template di kiosk: latar kartu, kartu terpilih, dan ikon
          centang. Teks pada kartu terpilih menyesuaikan kontras otomatis.
        </div>
      </PanelSection>
    );
  }

  // advanced: nothing template-grid-specific
  return null;
}
