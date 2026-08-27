"use client";

import { Paintbrush } from "lucide-react";
import {
  COMPONENT_STYLE_PRESET_OPTIONS,
  getPresetPropUpdates,
  readComponentStylePreset,
} from "@/features/builder/component-style-presets";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import type { BuilderNode } from "@/types/builder";

const PRESET_NODE_TYPES = new Set([
  "camera-timer",
  "camera-shot-counter",
  "camera-flash",
  "return-countdown",
]);

export function VisualStylePresetProperties({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  if (!PRESET_NODE_TYPES.has(selectedNode.type)) return null;
  const active = readComponentStylePreset(selectedNode.props);

  return (
    <PanelSection
      title="Style preset"
      icon={<Paintbrush className="size-3.5 text-zinc-500" />}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {COMPONENT_STYLE_PRESET_OPTIONS.map((preset) => {
          const selected = active === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                updateNodeProps(
                  selectedNode.id,
                  getPresetPropUpdates(selectedNode, preset.value),
                )
              }
              className={`rounded-lg border px-2.5 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86abd5] ${
                selected
                  ? "border-[#174a7e] bg-[#edf5ff] text-[#174a7e] shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <span className="block text-[11px] font-semibold">
                {preset.label}
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-zinc-400">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}
