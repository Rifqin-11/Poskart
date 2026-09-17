"use client";

import { ListChecks } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ColorField, PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function FlowProgressProperties({
  selectedNode,
  updateNodeProps,
  flowProgress,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  flowProgress?: { current: number; total: number };
}) {
  const update = (props: Record<string, unknown>) =>
    updateNodeProps(selectedNode.id, props);

  return (
    <PanelSection title="Flow Progress" icon={<ListChecks className="size-3.5 text-[#00357B]" />}>
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2 text-[10px] leading-4 text-[#24466f]">
        Node global — tampil di setiap halaman aktif. Preview saat ini:{" "}
        <span className="font-mono font-semibold">
          {flowProgress?.current ?? 0} / {flowProgress?.total ?? 0}
        </span>
      </div>
      <label className="block text-xs font-medium text-zinc-500">
        Variant
        <Select
          className="mt-1"
          value={readString(selectedNode.props.variant, "segments")}
          onChange={(event) => update({ variant: event.target.value })}
        >
          <option value="segments">Segments</option>
          <option value="dots">Dots</option>
          <option value="bar">Bar</option>
          <option value="number">Number</option>
        </Select>
      </label>
      <ColorField
        label="Active color"
        value={readString(selectedNode.props.activeColor, "#18181B")}
        onChange={(value) => update({ activeColor: value })}
      />
      <ColorField
        label="Inactive color"
        value={readString(selectedNode.props.inactiveColor, "#D4D4D8")}
        onChange={(value) => update({ inactiveColor: value })}
      />
      <label className="block text-xs font-medium text-zinc-500">
        Height
        <Input
          className="mt-1"
          type="number"
          min={2}
          max={64}
          value={readNumber(selectedNode.props.progressHeight, 8)}
          onChange={(event) => update({ progressHeight: Number(event.target.value) })}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-500">
        Gap
        <Input
          className="mt-1"
          type="number"
          min={0}
          max={64}
          value={readNumber(selectedNode.props.gap, 6)}
          onChange={(event) => update({ gap: Number(event.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
        <input
          type="checkbox"
          checked={selectedNode.props.showLabel === true}
          onChange={(event) => update({ showLabel: event.target.checked })}
        />
        Show step label
      </label>
      <label className="block text-xs font-medium text-zinc-500">
        Label format
        <Input
          className="mt-1"
          value={readString(selectedNode.props.labelFormat, "{current} / {total}")}
          onChange={(event) => update({ labelFormat: event.target.value })}
        />
        <span className="mt-1 block text-[10px] text-zinc-400">Use {'{current}'} and {'{total}'}.</span>
      </label>
    </PanelSection>
  );
}
