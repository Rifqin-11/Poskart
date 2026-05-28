"use client";

import { ImageOff, Layers } from "lucide-react";
import type { BuilderNode, BuilderPage, LayoutSchema } from "@/types/builder";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  button: { bg: "rgba(59,130,246,0.7)", border: "#1d4ed8" },
  text: { bg: "rgba(139,92,246,0.45)", border: "#7c3aed" },
  "social-handle": { bg: "rgba(139,92,246,0.35)", border: "#a78bfa" },
  "qr-placeholder": { bg: "rgba(245,158,11,0.55)", border: "#b45309" },
  qr: { bg: "rgba(245,158,11,0.55)", border: "#b45309" },
  "receipt-preview": { bg: "rgba(168,85,247,0.5)", border: "#7e22ce" },
  image: { bg: "rgba(16,185,129,0.45)", border: "#065f46" },
  "frame-preview": { bg: "rgba(16,185,129,0.35)", border: "#34d399" },
  "template-list": { bg: "rgba(234,88,12,0.5)", border: "#9a3412" },
  "template-preview": { bg: "rgba(234,88,12,0.4)", border: "#fb923c" },
  "background-decoration": { bg: "rgba(100,116,139,0.35)", border: "#94a3b8" },
  "return-countdown": { bg: "rgba(99,102,241,0.4)", border: "#6366f1" },
  "session-countdown": { bg: "rgba(244,63,94,0.4)", border: "#f43f5e" },
  "payment-countdown": { bg: "rgba(34,197,94,0.4)", border: "#22c55e" },
  "camera-view": { bg: "rgba(15,23,42,0.7)", border: "#1e293b" },
  "photo-result": { bg: "rgba(15,23,42,0.55)", border: "#334155" },
};

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
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
  const color = TYPE_COLORS[node.type] ?? {
    bg: "rgba(113,113,122,0.4)",
    border: "#71717a",
  };
  const imageUrl = readString(node.props?.imageUrl);

  const isMedia =
    node.type === "image" ||
    node.type === "frame-preview" ||
    node.type === "background-decoration";

  return (
    <div
      className="absolute overflow-hidden rounded-[2px]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        opacity: typeof node.opacity === "number" ? node.opacity : 1,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        background: isMedia && imageUrl ? "transparent" : color.bg,
        border: `1px solid ${color.border}`,
        zIndex: node.zIndex ?? 0,
      }}
    >
      {isMedia && imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : null}
      {node.type === "text" ? (
        <div className="flex h-full w-full items-center justify-center px-0.5">
          <span
            className="line-clamp-1 text-[6px] font-medium leading-none"
            style={{ color: color.border }}
          >
            {readString(node.props?.text, "Aa")}
          </span>
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
  const pageBg = canvas.pageBackgrounds?.[page]?.image;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-zinc-200",
        aspect,
        className,
      )}
      style={{ backgroundColor: canvas.backgroundColor ?? "#0f172a" }}
    >
      {pageBg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pageBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
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
