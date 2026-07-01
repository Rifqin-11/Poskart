"use client";

import QRCodeSVG from "react-qr-code";
import type React from "react";
import { Camera, Film, Image as ImageIcon, Share2 } from "lucide-react";
import { HOTSPOT_COLORS, SEMANTIC_ROLES } from "@/features/builder/constants";
import { isMediaNode, readNumber, readString } from "@/features/builder/utils";
import { calculatePhotoResultGrid, sanitizeSvgMarkup } from "@/features/builder/visual-builder.utils";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderNode } from "@/types/builder";

/** Hotspot overlay — shown when canvas has a background image/video */
function HotspotOverlay({ node }: { node: BuilderNode }) {
  const canvas = useBuilderStore((state) => state.canvas);
  const colors = HOTSPOT_COLORS[node.type] ?? {
    bg: "rgba(100,100,100,0.2)",
    border: "#71717a",
    text: "#3f3f46",
  };
  const role =
    typeof node.props.semanticRole === "string" ? node.props.semanticRole : "";

  // Scale labels proportionally to canvas width (min values for small canvases)
  const labelSize = Math.max(12, Math.round(canvas.width * 0.028));
  const roleSize = Math.max(10, Math.round(canvas.width * 0.022));
  const padH = Math.max(6, Math.round(canvas.width * 0.008));
  const padV = Math.max(3, Math.round(canvas.width * 0.004));
  const borderW = Math.max(2, Math.round(canvas.width * 0.003));

  const isQr =
    node.type === "qr" ||
    node.type === "qr-link" ||
    node.type === "qr-placeholder";
  const radius = readNumber(node.props.radius, 4);

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden text-center"
      style={{
        background: isQr ? "rgba(255, 255, 255, 0.9)" : colors.bg,
        borderColor: colors.border,
        borderWidth: borderW,
        borderStyle: "dashed",
        borderRadius: radius,
      }}
    >
      {/* If it's QR, render the QR pattern inside */}
      {(node.type === "qr" || node.type === "qr-link") && (
        <div className="absolute inset-0 p-3 opacity-30">
          <div className="grid size-full grid-cols-4 grid-rows-4 gap-1">
            {Array.from({ length: 16 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "rounded-sm",
                  index % 3 === 0 ? "bg-zinc-950" : "bg-zinc-200",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {node.type === "qr-placeholder" && (
        <div className="absolute inset-0 p-3 opacity-30">
          <div className="relative flex size-full flex-col items-center justify-center gap-1">
            {/* Corner squares (finder patterns) */}
            <div className="absolute left-0 top-0 size-8 rounded-sm border-[3px] border-zinc-800 bg-white">
              <div className="m-0.5 size-4 rounded-[2px] bg-zinc-800" />
            </div>
            <div className="absolute right-0 top-0 size-8 rounded-sm border-[3px] border-zinc-800 bg-white">
              <div className="m-0.5 size-4 rounded-[2px] bg-zinc-800" />
            </div>
            <div className="absolute bottom-0 left-0 size-8 rounded-sm border-[3px] border-zinc-800 bg-white">
              <div className="m-0.5 size-4 rounded-[2px] bg-zinc-800" />
            </div>
            {/* Module grid in the middle */}
            <div className="grid w-full max-w-[70%] grid-cols-6 gap-0.5 px-10">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-[1px]",
                    (i * 7 + i) % 5 === 0 ? "bg-zinc-800" : "bg-zinc-200",
                  )}
                />
              ))}
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-semibold uppercase tracking-widest text-zinc-400">
              QRIS — dari payment gateway
            </div>
          </div>
        </div>
      )}

      <span
        className="z-10 max-w-full truncate rounded font-bold uppercase tracking-wide"
        style={{
          color: colors.text,
          background: colors.border + "22",
          fontSize: labelSize,
          paddingLeft: padH,
          paddingRight: padH,
          paddingTop: padV,
          paddingBottom: padV,
        }}
      >
        {node.type}
      </span>

      {role ? (
        <span
          className="z-10 max-w-full truncate font-mono"
          style={{ color: colors.text, opacity: 0.85, fontSize: roleSize }}
        >
          {role}
        </span>
      ) : null}
    </div>
  );
}

export function NodeRenderer({
  node,
  editing,
  editValue,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onStartEdit,
}: {
  node: BuilderNode;
  editing?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  onEditCommit?: () => void;
  onEditCancel?: () => void;
  onStartEdit?: () => void;
}) {
  const canvas = useBuilderStore((state) => state.canvas);
  const isOverlayMode = !!canvas.overlayMode;
  const color = readString(node.props.color, "#18181b");

  const isCameraContinue =
    node.type === "button" &&
    readString((node.props.semanticRole as string | undefined) ?? "", "") ===
      "camera.continue";

  // Default font size scales with canvas (ref 1080px → 30px ≈ 2.8%; min 14px)
  const scaledDefaultFontSize = Math.max(14, Math.round(canvas.width * 0.028));
  const fontSize = readNumber(node.props.fontSize, scaledDefaultFontSize);

  // When a background image/video is set, all nodes become hotspot overlays, except camera.continue and QR codes
  if (
    isOverlayMode &&
    !isCameraContinue &&
    node.type !== "qr" &&
    node.type !== "qr-placeholder"
  ) {
    return <HotspotOverlay node={node} />;
  }

  if (node.type === "button") {
    const role = readString(
      (node.props.semanticRole as string | undefined) ?? "",
      "",
    );
    const roleLabel = SEMANTIC_ROLES.find((r) => r.value === role)?.label;
    const iconSvg =
      typeof node.props.iconSvg === "string"
        ? sanitizeSvgMarkup(node.props.iconSvg)
        : "";
    const iconPos =
      typeof node.props.iconPosition === "string"
        ? node.props.iconPosition
        : "left";
    const iconSize = readNumber(node.props.iconSize, 20);
    const label = readString(node.props.label, "Button");
    const btnColor = readString(node.props.color, "#ffffff");

    if (editing) {
      return (
        <input
          autoFocus
          className="h-full w-full border-none bg-transparent px-3 text-center text-sm font-medium outline-none"
          style={{
            background: readString(node.props.background, "#18181b"),
            color: btnColor,
            borderRadius: readNumber(node.props.radius, 6),
            fontSize: readNumber(node.props.fontSize, 14),
          }}
          value={editValue ?? ""}
          onChange={(event) => onEditChange?.(event.target.value)}
          onBlur={onEditCommit}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") onEditCommit?.();
            if (event.key === "Escape") onEditCancel?.();
          }}
        />
      );
    }

    // Fix SVG size: strip existing width/height attrs and set via style
    const scaledSvg = iconSvg
      ? iconSvg.replace(/^<svg([^>]*?)>/, (_, attrs: string) => {
          const clean = attrs.replace(/\s+(width|height)="[^"]*"/g, "");
          return `<svg${clean} style="width:${iconSize}px;height:${iconSize}px;display:block;">`;
        })
      : "";

    // Build icon element
    const iconEl = scaledSvg ? (
      <span
        className="shrink-0"
        style={{
          width: iconSize,
          height: iconSize,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        dangerouslySetInnerHTML={{ __html: scaledSvg }}
      />
    ) : null;

    // Layout based on iconPosition
    const isIconOnly = iconPos === "only";
    const isVertical = iconPos === "top" || iconPos === "bottom";
    const flexDir = isVertical ? "column" : "row";
    const reverseOrder = iconPos === "right" || iconPos === "bottom";

    const src = readString(node.props.src, "");
    if (src) {
      return (
        <div
          className="relative h-full w-full overflow-hidden"
          style={{
            borderRadius: readNumber(
              node.props.radius,
              Math.max(6, Math.round(canvas.width * 0.005)),
            ),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="h-full w-full object-fill pointer-events-none select-none"
          />
          {/* Semantic role badge */}
          {roleLabel ? (
            <span
              className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-950/80 px-1.5 py-0.5 font-mono text-white"
              style={{
                fontSize: Math.max(9, Math.round(canvas.width * 0.009)),
              }}
            >
              {role}
            </span>
          ) : (
            <span
              className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-500/90 px-1.5 py-0.5 font-mono text-white"
              style={{
                fontSize: Math.max(9, Math.round(canvas.width * 0.009)),
              }}
            >
              ⚠ no role set
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        className="relative h-full w-full overflow-hidden font-medium shadow-sm"
        style={{
          background: readString(node.props.background, "#18181b"),
          color: btnColor,
          borderRadius: readNumber(
            node.props.radius,
            Math.max(6, Math.round(canvas.width * 0.005)),
          ),
          fontSize: readNumber(node.props.fontSize, scaledDefaultFontSize),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: flexDir as React.CSSProperties["flexDirection"],
          gap: iconEl && !isIconOnly ? 6 : 0,
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onStartEdit?.();
        }}
      >
        {!reverseOrder && iconEl}
        {!isIconOnly && <span>{label}</span>}
        {reverseOrder && iconEl}
        {/* Semantic role badge */}
        {roleLabel ? (
          <span
            className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-950/80 px-1.5 py-0.5 font-mono text-white"
            style={{ fontSize: Math.max(9, Math.round(canvas.width * 0.009)) }}
          >
            {role}
          </span>
        ) : (
          <span
            className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-500/90 px-1.5 py-0.5 font-mono text-white"
            style={{ fontSize: Math.max(9, Math.round(canvas.width * 0.009)) }}
          >
            ⚠ no role set
          </span>
        )}
      </div>
    );
  }

  if (node.type === "qr-link") {
    const scale = node.height / 48;
    const label = readString(
      node.props.label,
      "https://poskart.my.id/s/MQ6V8EJW-4TSQZ",
    );
    const fontSize = readNumber(node.props.fontSize, 12);
    const qrBgColor = readString(node.props.qrBgColor, "#ffffff");
    const qrTextColor = readString(
      node.props.qrTextColor ?? node.props.color,
      "#3b82f6",
    );

    return (
      <div
        className="flex h-full w-full items-center justify-center px-3 border border-zinc-300"
        style={{
          borderRadius: readNumber(node.props.radius, 6),
          backgroundColor: qrBgColor,
        }}
      >
        <div
          className="w-full text-center truncate font-medium select-none"
          style={{
            fontSize: fontSize * scale,
            color: qrTextColor,
          }}
        >
          {label}
        </div>
      </div>
    );
  }

  if (node.type === "qr") {
    const qrColor = readString(node.props.qrColor, "#000000");
    const qrBgColor = readString(node.props.qrBgColor, "#ffffff");
    const qrTransparentBackground =
      node.props.qrTransparentBackground === true;
    const qrTextColor = readString(
      node.props.qrTextColor ?? node.props.color,
      "#27272a",
    );
    const showQrLink = node.props.showQrLink !== false;
    const showShareButton = node.props.showShareButton === true;
    const shareButtonLabel = readString(node.props.shareButtonLabel, "Share");
    const shareButtonBackground = readString(
      node.props.shareButtonBackground,
      "#18181b",
    );
    const shareButtonColor = readString(
      node.props.shareButtonColor,
      "#ffffff",
    );
    const sampleUrl = "https://poskart.my.id/s/MQ6V8EJW-4TSQZ";

    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-between overflow-visible border border-zinc-300 p-3"
        style={{
          borderRadius: readNumber(node.props.radius, 12),
          backgroundColor: qrTransparentBackground ? "transparent" : qrBgColor,
          fontFamily: "'Manrope', 'Outfit', 'Inter', sans-serif",
        }}
      >
        {/* QR code locked to 1:1 aspect ratio, fills available height */}
        <div
          className="flex-1 w-full flex items-center justify-center"
          style={{ minHeight: 0 }}
        >
          <div className="aspect-square h-full max-h-full">
            <QRCodeSVG
              value={sampleUrl}
              style={{ width: "100%", height: "100%", display: "block" }}
              fgColor={qrColor}
              bgColor="transparent"
              level="M"
            />
          </div>
        </div>
        {showQrLink && (
          <div
            className="mt-2 w-full text-center text-[10px] font-bold truncate px-1"
            style={{ color: qrTextColor }}
          >
            {sampleUrl}
          </div>
        )}
        {showShareButton && (
          <div
            className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full border border-white/80 shadow-lg"
            style={{
              backgroundColor: shareButtonBackground,
              color: shareButtonColor,
            }}
            title={shareButtonLabel}
          >
            <Share2 className="size-3.5" aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }

  if (node.type === "camera-view") {
    return (
      <div
        className="relative h-full w-full overflow-hidden bg-zinc-950"
        style={{
          borderRadius: readNumber(node.props.radius, 8),
        }}
      >
        {/* Camera grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
            backgroundSize: "33.33% 33.33%",
          }}
        />
        {/* Center camera icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="size-14 text-white/20" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">
            Live Camera Feed
          </span>
        </div>
        {/* Finder corners TL */}
        <div className="absolute left-3 top-3 h-7 w-7 border-l-2 border-t-2 border-white/60" />
        {/* Finder corners TR */}
        <div className="absolute right-3 top-3 h-7 w-7 border-r-2 border-t-2 border-white/60" />
        {/* Finder corners BL */}
        <div className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-white/60" />
        {/* Finder corners BR */}
        <div className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-white/60" />
        {/* LIVE badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5">
          <div className="size-1.5 animate-pulse rounded-full bg-white" />
          <span className="text-[9px] font-bold uppercase tracking-wide text-white">
            Live
          </span>
        </div>
        {/* Center crosshair */}
        <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-1/2 h-full w-px -translate-x-1/2 bg-white/30" />
          <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-white/30" />
        </div>
      </div>
    );
  }

  if (node.type === "photo-result") {
    const grid = calculatePhotoResultGrid(node);
    return (
      <div
        className="relative h-full w-full overflow-hidden border-2 border-dashed border-teal-400 bg-teal-50/70 p-2"
        style={{
          borderRadius: readNumber(node.props.radius, 8),
        }}
      >
        <div className="pointer-events-none flex h-full w-full flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal-600 shadow-sm">
              Photo Result
            </span>
            <span className="rounded-full bg-teal-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
              {grid.modeLabel}: {grid.label}
            </span>
          </div>
          <div
            className="grid min-h-0 flex-1 gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: grid.count }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-0 items-center justify-center rounded-md border border-teal-300/80 bg-white/75 text-[10px] font-semibold text-teal-700 shadow-sm"
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="text-center font-mono text-[10px] text-teal-600/80">
            rows × columns preview
          </div>
        </div>
      </div>
    );
  }

  if (node.type === "return-countdown") {
    const scale = node.height / 72;
    return (
      <div
        className="flex h-full w-full flex-col justify-center text-zinc-900 select-none px-1"
        style={{
          fontFamily: "'Manrope', 'Outfit', 'Inter', sans-serif",
        }}
      >
        <div
          className="flex w-full items-center justify-between"
          style={{ marginBottom: 10 * scale }}
        >
          <span
            style={{
              fontSize: 13 * scale,
              fontWeight: 700,
            }}
          >
            Kembali ke halaman awal
          </span>
          <span
            style={{
              fontSize: 12 * scale,
              color: "#71717a",
              fontWeight: 500,
            }}
          >
            39%
          </span>
        </div>
        <div
          className="w-full bg-zinc-200"
          style={{
            height: 7 * scale,
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          <div
            className="h-full bg-zinc-800"
            style={{
              width: "39%",
              borderRadius: 9999,
            }}
          />
        </div>
      </div>
    );
  }

  if (node.type === "session-countdown") {
    const label = readString(node.props.label, "Session ends in");
    const secs = readNumber(node.props.countdownSeconds, 300);
    const useGlobal = node.props.useGlobal !== false;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    const display =
      mins > 0 ? `${mins}:${String(remSecs).padStart(2, "0")}` : `${secs}s`;
    return (
      <div
        className="flex h-full w-full items-center gap-3 overflow-hidden border-2 border-dashed border-rose-300 bg-rose-50/70 px-3"
        style={{
          borderRadius: readNumber(node.props.radius, 8),
        }}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-rose-500 text-white">
          <span className="text-base">⏱</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-rose-600">
            {label}
          </span>
          <span className="font-mono text-base font-bold tabular-nums text-rose-700">
            {display}
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-rose-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-rose-500">
          {useGlobal ? "global" : "override"}
        </span>
      </div>
    );
  }

  if (node.type === "payment-countdown") {
    const label = readString(node.props.label, "Pay within");
    const secs = readNumber(node.props.countdownSeconds, 60);
    const useGlobal = node.props.useGlobal !== false;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    const display =
      mins > 0 ? `${mins}:${String(remSecs).padStart(2, "0")}` : `${secs}s`;
    return (
      <div
        className="flex h-full w-full items-center gap-3 overflow-hidden border-2 border-dashed border-emerald-300 bg-emerald-50/70 px-3"
        style={{
          borderRadius: readNumber(node.props.radius, 8),
        }}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-emerald-500 text-white">
          <span className="text-base">💳</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            {label}
          </span>
          <span className="font-mono text-base font-bold tabular-nums text-emerald-700">
            {display}
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-emerald-600">
          {useGlobal ? "global" : "override"}
        </span>
      </div>
    );
  }

  if (node.type === "template-list") {
    const minTileWidth = readNumber(node.props.minTileWidth, 280);
    const estimatedColumns = Math.max(
      1,
      Math.floor((node.width - 24) / minTileWidth),
    );
    const tileCount =
      typeof node.props.tileCount === "number" ? node.props.tileCount : 4;
    const tiles = Array.from({ length: tileCount });
    return (
      <div
        className="relative h-full w-full overflow-hidden border-2 border-dashed border-orange-300 bg-orange-50"
        style={{
          borderRadius: readNumber(node.props.radius, 12),
        }}
      >
        {/* pointer-events-none: inner display content never consumes mouse events */}
        <div className="pointer-events-none absolute inset-0 p-2">
          {/* Grid header */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">
              Template Grid (auto · {estimatedColumns} cols)
            </span>
            <span className="rounded bg-orange-200 px-1.5 py-0.5 text-[8px] font-semibold text-orange-700">
              template.select
            </span>
          </div>
          {/* Template tiles */}
          <div
            className="grid h-[calc(100%-28px)] gap-2"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minTileWidth}px), 1fr))`,
            }}
          >
            {tiles.map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm"
              >
                <div className="absolute inset-0 flex flex-col gap-1 p-2">
                  <div className="h-3/4 rounded bg-orange-100" />
                  <div className="h-1/6 rounded bg-orange-50" />
                </div>
                <div className="absolute inset-1 rounded border border-dashed border-orange-300/60" />
                <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-semibold text-orange-400">
                  Frame {i + 1}
                </div>
                {i === 0 && (
                  <div className="absolute inset-0 rounded-lg border-2 border-orange-500 bg-orange-500/10">
                    <div className="absolute right-1 top-1 rounded-full bg-orange-500 p-0.5">
                      <div className="size-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (node.type === "template-preview") {
    return (
      <div
        className="relative h-full w-full overflow-hidden border-2 border-dashed border-orange-300 bg-orange-50/60"
        style={{
          borderRadius: readNumber(node.props.radius, 12),
        }}
      >
        {/* pointer-events-none: inner display content never consumes mouse events */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative flex h-4/5 w-3/4 flex-col gap-1 rounded-lg border border-orange-200 bg-white p-2 shadow-md">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 rounded bg-orange-100/80" />
            ))}
            <div className="absolute inset-0 rounded-lg border-4 border-orange-400/30" />
          </div>
          <span className="mt-2 text-[9px] font-bold uppercase tracking-widest text-orange-400">
            Selected Frame Preview
          </span>
        </div>
      </div>
    );
  }

  if (node.type === "qr-placeholder") {
    const qrColor = readString(node.props.qrColor, "#000000");
    const qrBgColor = readString(node.props.qrBgColor, "#ffffff");
    const qrTransparentBackground =
      node.props.qrTransparentBackground === true;
    const qrTextColor = readString(
      node.props.qrTextColor ?? node.props.color,
      "#27272a",
    );
    // Realistic-looking QR placeholder — no real data, just visual structure
    return (
      <div
        className="grid h-full w-full place-items-center border-2 border-dashed border-zinc-300 p-3"
        style={{
          borderRadius: readNumber(node.props.radius, 8),
          backgroundColor: qrTransparentBackground ? "transparent" : qrBgColor,
        }}
      >
        <div className="relative flex size-full flex-col items-center justify-center gap-1">
          {/* Corner squares (finder patterns) */}
          <div
            className="absolute left-0 top-0 size-8 rounded-sm border-[3px] bg-white"
            style={{ borderColor: qrColor }}
          >
            <div
              className="m-0.5 size-4 rounded-[2px]"
              style={{ backgroundColor: qrColor }}
            />
          </div>
          <div
            className="absolute right-0 top-0 size-8 rounded-sm border-[3px] bg-white"
            style={{ borderColor: qrColor }}
          >
            <div
              className="m-0.5 size-4 rounded-[2px]"
              style={{ backgroundColor: qrColor }}
            />
          </div>
          <div
            className="absolute bottom-0 left-0 size-8 rounded-sm border-[3px] bg-white"
            style={{ borderColor: qrColor }}
          >
            <div
              className="m-0.5 size-4 rounded-[2px]"
              style={{ backgroundColor: qrColor }}
            />
          </div>
          {/* Module grid in the middle */}
          <div className="grid w-full max-w-[70%] grid-cols-6 gap-0.5 px-10">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-[1px]"
                style={{
                  backgroundColor:
                    (i * 7 + i) % 5 === 0 ? qrColor : "rgba(0,0,0,0.05)",
                }}
              />
            ))}
          </div>
          <div
            className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: qrTextColor }}
          >
            QRIS — dari payment gateway
          </div>
        </div>
      </div>
    );
  }

  if (node.type === "receipt-preview") {
    return (
      <div
        className="h-full w-full border border-dashed border-zinc-300 bg-white p-5 font-mono text-zinc-950 shadow-xl"
        style={{
          borderRadius: readNumber(node.props.radius, 4),
        }}
      >
        <div className="text-center text-sm font-bold">
          {readString(node.props.title, "POSKART")}
        </div>
        <div className="my-4 h-28 rounded bg-zinc-100" />
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>DOUBLE PRINT</span>
            <span>10K</span>
          </div>
          <div className="flex justify-between">
            <span>QR DOWNLOAD</span>
            <span>ON</span>
          </div>
          <div className="border-t border-dashed pt-2 text-center">
            {readString(node.props.code, "PK-0000")}
          </div>
        </div>
      </div>
    );
  }

  if (isMediaNode(node)) {
    const src = readString(node.props.src, "");
    const alt = readString(node.props.alt, node.type);
    const mediaType = readString(node.props.mediaType, "image");
    const radius = readNumber(
      node.props.radius,
      node.type === "background-decoration" ? 0 : 8,
    );
    const objectFit = readString(node.props.objectFit, "cover");
    const isVideo = mediaType === "video" || isDirectMp4Url(src);

    if (src) {
      if (isVideo) {
        return (
          <video
            aria-label={alt}
            className="h-full w-full bg-zinc-950"
            src={src}
            autoPlay
            muted
            loop
            playsInline
            style={{
              borderRadius: radius,
              objectFit:
                objectFit === "fill"
                  ? "fill"
                  : (objectFit as React.CSSProperties["objectFit"]),
            }}
          />
        );
      }

      return (
        <div
          aria-label={alt}
          role="img"
          className="h-full w-full bg-center"
          style={{
            borderRadius: radius,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: objectFit === "fill" ? "100% 100%" : objectFit,
          }}
        />
      );
    }

    return (
      <div
        className="grid h-full w-full place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-100 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
        style={{ borderRadius: radius }}
      >
        <div>
          {mediaType === "video" ? (
            <Film className="mx-auto mb-2 size-5" />
          ) : (
            <ImageIcon className="mx-auto mb-2 size-5" />
          )}
          {mediaType === "video" ? "video" : node.type}
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        className="h-full w-full resize-none border-none bg-white/80 outline-none"
        style={{
          color,
          fontSize,
          fontWeight: readNumber(node.props.fontWeight, 500),
          fontFamily: readString(
            node.props.fontFamily as string | undefined,
            "inherit",
          ),
          textAlign:
            (node.props.textAlign as React.CSSProperties["textAlign"]) ??
            "left",
          letterSpacing:
            node.props.letterSpacing != null
              ? `${node.props.letterSpacing}px`
              : undefined,
          lineHeight:
            node.props.lineHeight != null
              ? String(node.props.lineHeight)
              : "1.4",
        }}
        value={editValue ?? ""}
        onChange={(event) => onEditChange?.(event.target.value)}
        onBlur={onEditCommit}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onEditCancel?.();
          // Shift+Enter = commit; plain Enter = newline (default textarea)
          if (
            (event.metaKey || event.ctrlKey || event.shiftKey) &&
            event.key === "Enter"
          ) {
            event.preventDefault();
            onEditCommit?.();
          }
        }}
      />
    );
  }

  if (node.type === "preview-media-toggle") {
    const photoLabel = readString(node.props.photoLabel, "Photo");
    const gifLabel = readString(node.props.gifLabel, "GIF");
    const livePhotoLabel = readString(node.props.livePhotoLabel, "Live");
    const activeMode = readString(node.props.defaultMode, "photo");
    const items = [
      { value: "photo", label: photoLabel, icon: ImageIcon },
      { value: "gif", label: gifLabel, icon: Film },
      { value: "livePhoto", label: livePhotoLabel, icon: Camera },
    ];

    return (
      <div
        className="flex h-full w-full items-center gap-1 overflow-hidden rounded-full border border-white/55 bg-white/35 p-1 shadow-[0_12px_35px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        style={{
          fontFamily: "'Manrope', 'Outfit', 'Inter', sans-serif",
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeMode === item.value;
          return (
            <div
              key={item.value}
              className={cn(
                "flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-bold transition-colors",
                active
                  ? "border-white/70 bg-white/65 text-zinc-950 shadow-sm"
                  : "border-transparent bg-white/0 text-zinc-700/80",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        color,
        fontSize,
        fontWeight: readNumber(node.props.fontWeight, 500),
        fontStyle: node.props.fontItalic ? "italic" : "normal",
        textDecoration: node.props.fontUnderline ? "underline" : "none",
        fontFamily: readString(
          node.props.fontFamily as string | undefined,
          "inherit",
        ),
        // display: block (not flex) is required for textAlign to work correctly
        textAlign:
          (node.props.textAlign as React.CSSProperties["textAlign"]) ?? "left",
        letterSpacing:
          node.props.letterSpacing != null
            ? `${node.props.letterSpacing}px`
            : undefined,
        lineHeight:
          node.props.lineHeight != null ? String(node.props.lineHeight) : "1.4",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onStartEdit?.();
      }}
    >
      {readString(node.props.content, readString(node.props.label, node.type))}
    </div>
  );
}

function isDirectMp4Url(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol.startsWith("http") &&
      url.pathname.toLowerCase().endsWith(".mp4");
  } catch {
    return value.trim().toLowerCase().endsWith(".mp4");
  }
}
