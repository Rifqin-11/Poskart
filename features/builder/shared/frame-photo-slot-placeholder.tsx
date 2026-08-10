import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export const FRAME_PHOTO_SLOT_PALETTES = [
  ["#dbeafe", "#f0f9ff", "#bbf7d0", "#86efac"],
  ["#fee2e2", "#fef3c7", "#fed7aa", "#fb923c"],
  ["#e9d5ff", "#f5f3ff", "#c4b5fd", "#818cf8"],
  ["#cffafe", "#ecfeff", "#a7f3d0", "#34d399"],
] as const;

export function framePhotoSlotBackground(slotIndex: number) {
  const safeIndex = Number.isFinite(slotIndex) ? Math.max(0, slotIndex) : 0;
  const colors =
    FRAME_PHOTO_SLOT_PALETTES[safeIndex % FRAME_PHOTO_SLOT_PALETTES.length];
  return `linear-gradient(145deg,${colors[0]} 0%,${colors[1]} 48%,${colors[2]} 49%,${colors[3]} 100%)`;
}

export function FramePhotoSlotPlaceholder({
  slotIndex,
  label,
  className,
  style,
  borderColor,
  borderWidth = 0,
  radius = 0,
}: {
  slotIndex: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: framePhotoSlotBackground(slotIndex),
        borderColor,
        borderStyle: borderWidth > 0 ? "solid" : undefined,
        borderWidth,
        borderRadius: radius,
        ...style,
      }}
    >
      <div className="absolute left-[14%] top-[14%] flex h-[17%] min-h-3 w-[42%] items-center justify-center rounded-full bg-white/75 px-[4%]">
        {label ? (
          <span className="truncate text-[clamp(7px,0.7rem,12px)] font-semibold tracking-wide text-slate-700/55">
            {label}
          </span>
        ) : null}
      </div>
      <div className="absolute bottom-[12%] right-[12%] size-[30%] rounded-full bg-white/25" />
    </div>
  );
}
