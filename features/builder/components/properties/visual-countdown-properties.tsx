"use client";

import { Clock, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PanelSection } from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualCountdownProperties({
  selectedNode,
  updateNodeProps,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
}) {
  if (selectedNode.type === "session-countdown") {
    return (
      <PanelSection
        title="Session Countdown"
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
            checked={selectedNode.props.useGlobal !== false}
            description="When checked, Flutter reads the device session_countdown_seconds or app_config fallback."
            onChange={(checked) =>
              updateNodeProps(selectedNode.id, { useGlobal: checked })
            }
          />
          <CountdownDurationInput
            disabled={selectedNode.props.useGlobal !== false}
            value={readNumber(selectedNode.props.countdownSeconds, 300)}
            min={30}
            max={1800}
            onChange={(value) =>
              updateNodeProps(selectedNode.id, { countdownSeconds: value })
            }
          />
          <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[10px] leading-4 text-rose-600">
            <strong>Flutter:</strong> total time across template, camera,
            preview, and thanks. When the timer hits 0, the app auto-returns to
            Landing.
          </div>
        </div>
      </PanelSection>
    );
  }

  if (selectedNode.type === "payment-countdown") {
    return (
      <PanelSection
        title="Payment Countdown"
        icon={<CreditCard className="size-3.5 text-zinc-500" />}
      >
        <div className="space-y-2 text-xs text-zinc-500">
          <label className="block">
            Label
            <Input
              className="mt-1"
              value={readString(selectedNode.props.label, "Pay within")}
              placeholder="Pay within"
              onChange={(event) =>
                updateNodeProps(selectedNode.id, { label: event.target.value })
              }
            />
          </label>
          <CountdownGlobalToggle
            checked={selectedNode.props.useGlobal !== false}
            description="When checked, Flutter reads the device payment_countdown_seconds."
            onChange={(checked) =>
              updateNodeProps(selectedNode.id, { useGlobal: checked })
            }
          />
          <CountdownDurationInput
            disabled={selectedNode.props.useGlobal !== false}
            value={readNumber(selectedNode.props.countdownSeconds, 60)}
            min={10}
            max={600}
            onChange={(value) =>
              updateNodeProps(selectedNode.id, { countdownSeconds: value })
            }
          />
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-[10px] leading-4 text-emerald-700">
            <strong>Flutter:</strong> when the QRIS payment timer reaches 0,
            the payment dialog cancels and returns to Landing.
          </div>
        </div>
      </PanelSection>
    );
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
