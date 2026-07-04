"use client";

import { Pipette, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
  const cleanup = cleanupFromSettings(settings);

  const patch = (partial: Partial<ColorKeySettings>) => {
    onChange(normalizeColorKey({ ...settings, enabled: true, ...partial }));
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
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
          baked on save
        </span>
      </div>

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
        Cleanup: {cleanup}
        <Slider
          className="mt-1"
          min={0}
          max={100}
          step={1}
          value={cleanup}
          onChange={(event) => patch(settingsFromCleanup(Number(event.target.value)))}
        />
      </label>
    </div>
  );
}

function cleanupFromSettings(settings: ColorKeySettings) {
  return Math.min(
    100,
    Math.max(0, Math.round(((settings.tolerance - 32) / (255 - 32)) * 100)),
  );
}

function settingsFromCleanup(value: number): Partial<ColorKeySettings> {
  const cleanup = Math.min(100, Math.max(0, Math.round(value)));
  return {
    tolerance: Math.round(32 + (cleanup / 100) * 223),
    softness: Math.round(10 - (cleanup / 100) * 10),
    smoothness: Math.round((cleanup / 100) * 1),
  };
}
