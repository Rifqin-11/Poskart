"use client";

import { ImageOff, Video } from "lucide-react";
import { ColorKeyImage } from "@/features/builder/components/color-key-image";
import type { BuilderPage, LayoutSchema } from "@/types/builder";
import { cn } from "@/lib/utils";

const FALLBACK_PREVIEW_BG = "#fafafa";

function parseHexColor(value?: string) {
  if (!value?.startsWith("#")) return null;
  const hex = value.replace("#", "").trim();
  if (![3, 6].includes(hex.length)) return null;
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => part + part)
          .join("")
      : hex;
  const int = Number.parseInt(normalized, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function safePreviewBackground(value?: string) {
  const color = parseHexColor(value);
  if (!color) return FALLBACK_PREVIEW_BG;
  const luminance =
    (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  const saturation =
    (Math.max(color.r, color.g, color.b) -
      Math.min(color.r, color.g, color.b)) /
    255;

  if (luminance < 0.65 || saturation > 0.42) {
    return FALLBACK_PREVIEW_BG;
  }

  return value;
}

export function ThemeThumbnail({
  schema,
  page = "landing",
  className,
}: {
  schema: LayoutSchema | null | undefined;
  page?: BuilderPage;
  className?: string;
}) {
  if (!schema || !schema.canvas) {
    return (
      <div
        className={cn(
          "grid aspect-video place-items-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 text-zinc-300",
          className,
        )}
      >
        <ImageOff className="size-6" />
      </div>
    );
  }

  const canvas = schema.canvas;
  const isPortrait = canvas.orientation === "portrait";
  const aspect = isPortrait ? "aspect-[3/4]" : "aspect-[16/9]";
  const pageBackground = canvas.pageBackgrounds?.[page];
  const landingImage = pageBackground?.image ?? canvas.backgroundImage;
  const landingVideo = pageBackground?.video ?? canvas.backgroundVideo;
  const backgroundColor = safePreviewBackground(canvas.backgroundColor);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-zinc-200 bg-white",
        aspect,
        className,
      )}
      style={{ backgroundColor }}
    >
      {landingImage ? (
        <ColorKeyImage
          src={landingImage}
          fit="cover"
          colorKey={pageBackground?.colorKey}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : landingVideo ? (
        <>
          <video
            src={landingVideo}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase text-white">
            <Video className="size-3" />
            Video
          </div>
        </>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor }} />
      )}
    </div>
  );
}
