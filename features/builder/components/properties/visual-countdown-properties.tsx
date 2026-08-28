"use client";

import { Clock, CreditCard, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  ColorField,
  PanelSection,
} from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualCountdownProperties({
  selectedNode,
  updateNodeProps,
  section,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  section?: "content" | "style" | "advanced";
}) {
  if (selectedNode.type === "return-countdown") {
    if (section === "content") {
      return (
        <PanelSection
          title="Auto Return Timer"
          icon={<RotateCcw className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Label
              <Input
                className="mt-1"
                value={readString(selectedNode.props.countdownText, "Kembali ke halaman awal")}
                placeholder="Kembali ke halaman awal"
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, { countdownText: event.target.value })
                }
              />
            </label>
          </div>
        </PanelSection>
      );
    }

    if (section === "style") {
      return (
        <PanelSection
          title="Auto Return Timer"
          icon={<RotateCcw className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Layout
              <select
                className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus:ring-1 focus:ring-zinc-400"
                value={readString(selectedNode.props.countdownVariant, "bar")}
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, {
                    countdownVariant: event.target.value,
                  })
                }
              >
                <option value="bar">Label + progress bar</option>
                <option value="circle">Circle countdown</option>
              </select>
            </label>
            <ColorField
              label="Text color"
              value={readString(selectedNode.props.textColor, "#000000")}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { textColor: value })
              }
            />
            <ColorField
              label="Progress bar color"
              value={readString(selectedNode.props.progressColor, "#27272A")}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { progressColor: value })
              }
            />
          </div>
        </PanelSection>
      );
    }

    if (section === "advanced") {
      return (
        <PanelSection
          title="Auto Return Timer"
          icon={<RotateCcw className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <CountdownDurationInput
              disabled={selectedNode.props.useGlobalDuration !== false}
              value={readNumber(selectedNode.props.countdownSeconds, 8)}
              min={3}
              max={60}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { countdownSeconds: value })
              }
            />
            <label className="flex items-start gap-2 text-xs text-zinc-500">
              <input
                className="mt-0.5 size-3.5 accent-zinc-800"
                type="checkbox"
                checked={selectedNode.props.useGlobalDuration !== false}
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, {
                    useGlobalDuration: event.target.checked,
                  })
                }
              />
              <span>
                Use device setting
                <span className="mt-0.5 block text-[10px] text-zinc-400">
                  Follow the auto-return duration configured on the kiosk.
                </span>
              </span>
            </label>
          </div>
        </PanelSection>
      );
    }

    return null;
  }

  if (selectedNode.type === "session-countdown") {
    if (section === "content") {
      return (
        <PanelSection
          title="Session Timer"
          icon={<Clock className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Label
              <Input
                className="mt-1"
                value={readString(selectedNode.props.label, "Session ends in")}
                placeholder="Session ends in"
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, { label: event.target.value })
                }
              />
            </label>
            <CountdownGlobalToggle
              checked={selectedNode.props.useGlobalDuration === true}
              description="Use the session duration from device settings."
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { useGlobalDuration: value })
              }
            />
          </div>
        </PanelSection>
      );
    }

    if (section === "style") {
      return (
        <PanelSection
          title="Session Timer"
          icon={<Clock className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <ColorField
              label="Text color"
              value={readString(selectedNode.props.textColor, "#000000")}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { textColor: value })
              }
            />
            <ColorField
              label="Progress bar color"
              value={readString(selectedNode.props.progressColor, "#27272A")}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { progressColor: value })
              }
            />
          </div>
        </PanelSection>
      );
    }

    if (section === "advanced") {
      return (
        <PanelSection
          title="Session Timer"
          icon={<Clock className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <CountdownDurationInput
              disabled={selectedNode.props.useGlobalDuration === true}
              value={readNumber(selectedNode.props.durationSeconds, 60)}
              min={10}
              max={3600}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { durationSeconds: value })
              }
            />
          </div>
        </PanelSection>
      );
    }

    return null;
  }

  if (selectedNode.type === "payment-countdown") {
    if (section === "content") {
      return (
        <PanelSection
          title="Payment Timer"
          icon={<CreditCard className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <label className="block">
              Label
              <Input
                className="mt-1"
                value={readString(selectedNode.props.label, "Payment expires in")}
                placeholder="Payment expires in"
                onChange={(event) =>
                  updateNodeProps(selectedNode.id, { label: event.target.value })
                }
              />
            </label>
            <CountdownGlobalToggle
              checked={selectedNode.props.useGlobalDuration === true}
              description="Use the payment timeout from device settings."
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { useGlobalDuration: value })
              }
            />
          </div>
        </PanelSection>
      );
    }

    if (section === "style") {
      return (
        <PanelSection
          title="Payment Timer"
          icon={<CreditCard className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <ColorField
              label="Text color"
              value={readString(selectedNode.props.textColor, "#000000")}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { textColor: value })
              }
            />
            <ColorField
              label="Progress bar color"
              value={readString(selectedNode.props.progressColor, "#27272A")}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { progressColor: value })
              }
            />
          </div>
        </PanelSection>
      );
    }

    if (section === "advanced") {
      return (
        <PanelSection
          title="Payment Timer"
          icon={<CreditCard className="size-3.5 text-zinc-500" />}
        >
          <div className="space-y-2 text-xs text-zinc-500">
            <CountdownDurationInput
              disabled={selectedNode.props.useGlobalDuration === true}
              value={readNumber(selectedNode.props.durationSeconds, 300)}
              min={30}
              max={3600}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { durationSeconds: value })
              }
            />
          </div>
        </PanelSection>
      );
    }

    return null;
  }

  return null;
}

function CountdownGlobalToggle({
  checked,
  description,
  onChange,
}: {
  checked: boolean;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        Use device/global value
        <span className="block text-[10px] text-zinc-400">{description}</span>
      </span>
    </label>
  );
}

function CountdownDurationInput({
  disabled,
  value,
  min,
  max,
  onChange,
}: {
  disabled: boolean;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      Override duration (seconds)
      <Input
        className="mt-1"
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
