"use client";

import { Pipette, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { normalizeColorKey } from "@/lib/color-key";
import type { ColorKeySettings } from "@/types/color-key";

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

type EyeDropperWindow = Window & {
  EyeDropper?: EyeDropperConstructor;
};

export function ColorKeyControls({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: ColorKeySettings) => void;
}) {
  const settings = normalizeColorKey(value);

  const patch = (partial: Partial<ColorKeySettings>) => {
    onChange(normalizeColorKey({ ...settings, ...partial }));
  };

  const pickColor = async () => {
    const EyeDropper = (window as EyeDropperWindow).EyeDropper;
    if (!EyeDropper) {
      toast.message("EyeDropper belum tersedia di browser ini. Pakai color input.");
      return;
    }

    try {
      const result = await new EyeDropper().open();
      patch({ color: result.sRGBHex, enabled: true });
    } catch {
      // User cancelled the picker.
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
          <Scissors className="size-3.5 text-zinc-500" />
          Remove background
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(enabled) => patch({ enabled })}
          aria-label="Toggle remove background"
        />
      </div>

      {settings.enabled ? (
        <>
          <div className="grid grid-cols-[34px_1fr_34px] gap-2">
            <Input
              className="h-8 p-1"
              type="color"
              value={settings.color}
              onChange={(event) => patch({ color: event.target.value })}
              aria-label="Color key"
            />
            <Input
              className="h-8 font-mono text-[11px]"
              value={settings.color}
              onChange={(event) => patch({ color: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={pickColor}
              title="Pick color from screen"
            >
              <Pipette className="size-3.5" />
            </Button>
          </div>

          <label className="block text-[11px] font-medium text-zinc-500">
            Tolerance: {settings.tolerance}
            <Slider
              className="mt-1"
              min={0}
              max={255}
              step={1}
              value={settings.tolerance}
              onChange={(event) =>
                patch({ tolerance: Number(event.target.value) })
              }
            />
          </label>

          <label className="block text-[11px] font-medium text-zinc-500">
            Softness: {settings.softness}
            <Slider
              className="mt-1"
              min={0}
              max={100}
              step={1}
              value={settings.softness}
              onChange={(event) =>
                patch({ softness: Number(event.target.value) })
              }
            />
          </label>

          <label className="block text-[11px] font-medium text-zinc-500">
            Smoothness: {settings.smoothness ?? 2}
            <Slider
              className="mt-1"
              min={0}
              max={20}
              step={1}
              value={settings.smoothness ?? 2}
              onChange={(event) =>
                patch({ smoothness: Number(event.target.value) })
              }
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
