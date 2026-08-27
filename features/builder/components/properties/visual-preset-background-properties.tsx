"use client";

import { Palette } from "lucide-react";
import {
  ColorField,
  PanelSection,
} from "@/features/builder/components/visual-properties-primitives";
import {
  getComponentStyleTokens,
  readComponentStylePreset,
} from "@/features/builder/component-style-presets";
import type { BuilderNode } from "@/types/builder";

const BACKGROUND_PRESETS = new Set(["retro", "playful"]);

export function VisualPresetBackgroundProperties({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const preset = readComponentStylePreset(selectedNode.props);
  if (!BACKGROUND_PRESETS.has(preset)) return null;

  const tokens = getComponentStyleTokens(selectedNode);
  return (
    <PanelSection
      title="Preset background"
      icon={<Palette className="size-3.5 text-zinc-500" />}
    >
      <ColorField
        label={`${preset === "retro" ? "Retro" : "Playful"} background`}
        value={tokens.surfaceColor}
        onChange={(value) =>
          updateNodeProps(selectedNode.id, { presetBackgroundColor: value })
        }
      />
      <p className="text-[10px] leading-relaxed text-zinc-400">
        Mengubah warna surface tanpa mengubah bentuk, shadow, atau tipografi.
      </p>
    </PanelSection>
  );
}
