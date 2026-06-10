"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DEFAULT_FRAME_CANVAS, type FrameLayout, type FrameNode } from "@/types/frame-template";
import type { Template } from "@/types/template";

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function makeFallbackLayout(template: Template): FrameLayout {
  const canvas = { ...DEFAULT_FRAME_CANVAS };
  const columns = template.photoCount <= 2 ? 1 : 2;
  const rows = Math.ceil(template.photoCount / columns);
  const gap = 18;
  const outer = 34;
  const slotWidth = (canvas.width - outer * 2 - gap * (columns - 1)) / columns;
  const slotHeight = Math.min(150, (canvas.height - 150 - gap * (rows - 1)) / rows);
  const slots: FrameNode[] = Array.from({ length: template.photoCount }).map((_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      id: `photo-${index + 1}`,
      type: "photo-slot",
      x: outer + col * (slotWidth + gap),
      y: 92 + row * (slotHeight + gap),
      width: slotWidth,
      height: slotHeight,
      rotation: 0,
      opacity: 1,
      zIndex: index + 2,
      locked: false,
      props: { label: `Photo ${index + 1}`, background: "#f4f4f5", borderColor: "#d4d4d8", radius: 10 },
    };
  });

  const nodes: FrameNode[] = [
    {
      id: "frame-title",
      type: "text",
      x: 34,
      y: 30,
      width: 260,
      height: 40,
      rotation: 0,
      opacity: 1,
      zIndex: 20,
      locked: false,
      props: { content: template.name, color: template.accentColor, fontSize: 26, fontWeight: 700 },
    },
    ...slots,
    {
      id: "frame-border",
      type: "border",
      x: 16,
      y: 16,
      width: canvas.width - 32,
      height: canvas.height - 32,
      rotation: 0,
      opacity: 1,
      zIndex: 30,
      locked: false,
      props: { borderColor: template.accentColor, borderWidth: 2, radius: 18 },
    },
  ];

  if (template.frameImageUrl) {
    nodes.unshift({
      id: "frame-background",
      type: "background",
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      locked: true,
      props: { src: template.frameImageUrl, objectFit: "cover", radius: 0 },
    });
  }

  return { version: 1, canvas, nodes };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawContainImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function renderFrameToCanvas(canvas: HTMLCanvasElement, layout: FrameLayout, photos: string[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(layout.canvas.width * dpr);
  canvas.height = Math.round(layout.canvas.height * dpr);
  canvas.style.width = `${layout.canvas.width}px`;
  canvas.style.height = `${layout.canvas.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, layout.canvas.width, layout.canvas.height);
  ctx.fillStyle = layout.canvas.backgroundColor;
  ctx.fillRect(0, 0, layout.canvas.width, layout.canvas.height);

  const orderedNodes = layout.nodes.slice().sort((a, b) => a.zIndex - b.zIndex);
  const photoSlots = layout.nodes.filter((node) => node.type === "photo-slot");
  const sortedPhotoSlots = [...photoSlots].sort((a, b) => {
    const labelA = String(a.props?.label || "");
    const labelB = String(b.props?.label || "");
    const matchA = /Photo\s+(\d+)/.exec(labelA);
    const matchB = /Photo\s+(\d+)/.exec(labelB);
    const idxA = matchA ? parseInt(matchA[1], 10) - 1 : photoSlots.indexOf(a);
    const idxB = matchB ? parseInt(matchB[1], 10) - 1 : photoSlots.indexOf(b);
    return idxA - idxB;
  });
  const photoSlotIds = sortedPhotoSlots.map((node) => node.id);
  const imageCache = new Map<string, HTMLImageElement>();

  for (const node of orderedNodes) {
    ctx.save();
    ctx.globalAlpha = node.opacity;
    ctx.translate(node.x + node.width / 2, node.y + node.height / 2);
    ctx.rotate((node.rotation * Math.PI) / 180);
    const x = -node.width / 2;
    const y = -node.height / 2;

    if (node.type === "background" || node.type === "image") {
      const src = readString(node.props.src, "");
      if (src) {
        let image = imageCache.get(src);
        if (!image) {
          image = await loadImage(src);
          imageCache.set(src, image);
        }
        const radius = readNumber(node.props.radius, node.type === "background" ? 0 : 8);
        roundedRect(ctx, x, y, node.width, node.height, radius);
        ctx.clip();
        const fit = readString(node.props.objectFit, "cover");
        if (fit === "contain") {
          drawContainImage(ctx, image, x, y, node.width, node.height);
        } else if (fit === "fill") {
          ctx.drawImage(image, x, y, node.width, node.height);
        } else {
          drawCoverImage(ctx, image, x, y, node.width, node.height);
        }
      }
    }

    if (node.type === "photo-slot") {
      const radius = readNumber(node.props.radius, 10);
      roundedRect(ctx, x, y, node.width, node.height, radius);
      ctx.clip();
      const slotIndex = photoSlotIds.indexOf(node.id);
      const photo = photos[slotIndex];
      if (photo) {
        let image = imageCache.get(photo);
        if (!image) {
          image = await loadImage(photo);
          imageCache.set(photo, image);
        }
        drawCoverImage(ctx, image, x, y, node.width, node.height);
      } else {
        ctx.fillStyle = readString(node.props.background, "#f4f4f5");
        ctx.fillRect(x, y, node.width, node.height);
        ctx.fillStyle = "#71717a";
        ctx.font = "600 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(readString(node.props.label, `Photo ${slotIndex + 1}`), 0, 0);
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = node.opacity;
      ctx.translate(node.x + node.width / 2, node.y + node.height / 2);
      ctx.rotate((node.rotation * Math.PI) / 180);
      roundedRect(ctx, x, y, node.width, node.height, radius);
      ctx.strokeStyle = readString(node.props.borderColor, "#d4d4d8");
      ctx.lineWidth = Math.max(1, readNumber(node.props.borderWidth, 2));
      ctx.setLineDash(photo ? [] : [8, 6]);
      ctx.stroke();
    }

    if (node.type === "border") {
      roundedRect(ctx, x, y, node.width, node.height, readNumber(node.props.radius, 18));
      ctx.strokeStyle = readString(node.props.borderColor, "#18181b");
      ctx.lineWidth = readNumber(node.props.borderWidth, 2);
      ctx.stroke();
    }

    if (node.type === "text" || node.type === "date-stamp") {
      const content = readString(node.props.content, node.type === "date-stamp" ? "DD.MM.YYYY" : "Text").replace(
        "DD.MM.YYYY",
        new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()),
      );
      ctx.fillStyle = readString(node.props.color, "#18181b");
      ctx.font = `${readNumber(node.props.fontWeight, 600)} ${readNumber(node.props.fontSize, 18)}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(content, x, y + node.height / 2, node.width);
    }

    ctx.restore();
  }
}

export function FrameTemplateTester({
  template,
  open,
  onOpenChange,
}: {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const layout = useMemo(() => (template ? template.frameLayout ?? makeFallbackLayout(template) : null), [template]);
  const photoSlotCount = layout?.nodes.filter((node) => node.type === "photo-slot").length ?? template?.photoCount ?? 0;

  useEffect(() => () => {
    photos.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    if (!canvasRef.current || !layout) return;
    let cancelled = false;
    renderFrameToCanvas(canvasRef.current, layout, photos).catch(() => {
      if (!cancelled) toast.error("Some images could not be rendered. Check image URL access.");
    });
    return () => {
      cancelled = true;
    };
  }, [layout, photos]);

  const handleFiles = (files?: FileList | null) => {
    if (!files?.length) return;
    photos.forEach((url) => URL.revokeObjectURL(url));
    setPhotos(Array.from(files).slice(0, photoSlotCount).map((file) => URL.createObjectURL(file)));
  };

  const downloadPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;
    const link = document.createElement("a");
    link.download = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-frame-test.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Test frame${template ? `: ${template.name}` : ""}`}>
      {template && layout ? (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-4">
            <div className="mx-auto w-fit">
              <canvas ref={canvasRef} className="max-h-[70vh] max-w-full rounded-md bg-white shadow-xl" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">Upload test photo</div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Upload up to {photoSlotCount} photo{photoSlotCount > 1 ? "s" : ""}. Photos are placed into frame slots in order.
              </p>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 p-5 text-center text-sm font-medium text-zinc-600 hover:border-zinc-400">
              <ImagePlus className="size-5 text-zinc-400" />
              Choose photo
              <Input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple={photoSlotCount > 1}
                onChange={(event) => handleFiles(event.target.files)}
              />
            </label>
            {photos.length ? (
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div key={photo} className="relative size-14 overflow-hidden rounded-md border border-zinc-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-zinc-500 shadow"
                      onClick={() => {
                        URL.revokeObjectURL(photo);
                        setPhotos((current) => current.filter((item) => item !== photo));
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <Button className="w-full" onClick={downloadPreview}>
              <Download className="size-4" />
              Download PNG
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
