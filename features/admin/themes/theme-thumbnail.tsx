"use client";

import { ImageOff, Image as ImageIcon, Layers } from "lucide-react";
import type { BuilderNode, BuilderPage, LayoutSchema } from "@/types/builder";
import { cn } from "@/lib/utils";

const FALLBACK_PREVIEW_BG = "#fafafa";

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

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

function MiniNode({
  node,
  canvasWidth,
  canvasHeight,
}: {
  node: BuilderNode;
  canvasWidth: number;
  canvasHeight: number;
}) {
  if (node.visible === false) return null;
  const left = (node.x / canvasWidth) * 100;
  const top = (node.y / canvasHeight) * 100;
  const width = (node.width / canvasWidth) * 100;
  const height = (node.height / canvasHeight) * 100;
  const imageUrl = readString(node.props?.imageUrl);

  const isMedia =
    node.type === "image" ||
    node.type === "frame-preview" ||
    node.type === "background-decoration";
  const isLarge = width * height > 2400;
  const isText = node.type === "text" || node.type === "social-handle";
  const isButton = node.type === "button";
  const isPreviewSurface = [
    "camera-view",
    "photo-result",
    "receipt-preview",
    "template-list",
    "template-preview",
    "preview-media-toggle",
    "qr",
    "qr-placeholder",
  ].includes(node.type);

  const fill = isText
    ? "transparent"
    : isButton
      ? "#18181b"
      : isPreviewSurface
        ? isLarge
          ? "rgba(244,244,245,0.68)"
          : "rgba(244,244,245,0.9)"
        : isMedia
          ? imageUrl
            ? "transparent"
            : "rgba(244,244,245,0.4)"
          : "rgba(244,244,245,0.72)";
  const borderColor = isText
    ? "transparent"
    : isButton
      ? "#18181b"
      : "rgba(161,161,170,0.65)";

  return (
    <div
      className="absolute overflow-hidden rounded-[3px]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        opacity: Math.min(
          typeof node.opacity === "number" ? node.opacity : 1,
          isLarge ? 0.74 : 0.95,
        ),
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        background: fill,
        border:
          isText && !readString(node.props?.text)
            ? "none"
            : `1px solid ${borderColor}`,
        zIndex: node.zIndex ?? 0,
      }}
    >
      {isMedia && imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : null}
      {isText ? (
        <div className="flex h-full w-full items-center justify-center px-0.5">
          <span className="line-clamp-1 text-[6px] font-semibold leading-none text-zinc-700/75">
            {readString(node.props?.text, "Aa")}
          </span>
        </div>
      ) : null}
      {isMedia && !imageUrl ? (
        <div className="grid h-full w-full place-items-center text-zinc-300">
          <ImageIcon className="size-3" />
        </div>
      ) : null}
    </div>
  );
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
  const nodes = (schema.pages?.[page] ?? [])
    .slice()
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const pageBackground = canvas.pageBackgrounds?.[page];
  const pageBg = pageBackground?.image;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-zinc-200 bg-white",
        aspect,
        className,
      )}
      style={{ backgroundColor: safePreviewBackground(canvas.backgroundColor) }}
    >
      {pageBg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pageBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: pageBackground?.zIndex ?? 0 }}
        />
      ) : null}
      {nodes.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center text-zinc-200/60">
          <div className="flex flex-col items-center gap-1">
            <Layers className="size-4" />
            <span className="text-[8px] uppercase tracking-wider">
              Empty page
            </span>
          </div>
        </div>
      ) : (
        nodes.map((node) => (
          <MiniNode
            key={node.id}
            node={node}
            canvasWidth={canvas.width || 1280}
            canvasHeight={canvas.height || 800}
          />
        ))
      )}
    </div>
  );
}
