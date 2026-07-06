"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Hand, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  applyColorKeyToImageData,
  drawImageFitted,
  normalizeColorKey,
} from "@/lib/color-key";
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
      props: {
        label: `Photo ${index + 1}`,
        photoOrder: index + 1,
        background: "#f4f4f5",
        borderColor: "#d4d4d8",
        radius: 10,
      },
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

type PhotoPosition = {
  x: number;
  y: number;
};

const CENTER_PHOTO_POSITION: PhotoPosition = { x: 0.5, y: 0.5 };

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  position: PhotoPosition = CENTER_PHOTO_POSITION,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, image.naturalWidth - sourceWidth) * position.x;
  const sourceY = Math.max(0, image.naturalHeight - sourceHeight) * position.y;
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function drawContainImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawFittedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: string,
) {
  if (fit === "contain") {
    drawContainImage(ctx, image, x, y, width, height);
  } else if (fit === "fill") {
    ctx.drawImage(image, x, y, width, height);
  } else {
    drawCoverImage(ctx, image, x, y, width, height);
  }
}

function drawColorKeyImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: string,
  colorKey: unknown,
) {
  const settings = normalizeColorKey(colorKey);
  if (!settings.enabled) {
    drawFittedImage(ctx, image, x, y, width, height, fit);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const temp = document.createElement("canvas");
  temp.width = Math.max(1, Math.round(width * dpr));
  temp.height = Math.max(1, Math.round(height * dpr));
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) {
    drawFittedImage(ctx, image, x, y, width, height, fit);
    return;
  }

  tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tempCtx.clearRect(0, 0, width, height);
  drawImageFitted(tempCtx, image, width, height, fit);

  try {
    const imageData = tempCtx.getImageData(0, 0, temp.width, temp.height);
    applyColorKeyToImageData(imageData, settings);
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(temp, x, y, width, height);
  } catch {
    drawFittedImage(ctx, image, x, y, width, height, fit);
  }
}

function getSortedPhotoSlots(layout: FrameLayout) {
  const photoSlots = layout.nodes.filter((node) => node.type === "photo-slot");
  return [...photoSlots].sort((a, b) => {
    const orderA = readNumber(a.props.photoOrder, 0);
    const orderB = readNumber(b.props.photoOrder, 0);
    if (orderA > 0 || orderB > 0) {
      if (orderA !== orderB) {
        return (
          (orderA || photoSlots.indexOf(a) + 1) -
          (orderB || photoSlots.indexOf(b) + 1)
        );
      }
      return photoSlots.indexOf(a) - photoSlots.indexOf(b);
    }
    const labelA = String(a.props?.label || "");
    const labelB = String(b.props?.label || "");
    const matchA = /Photo\s+(\d+)/.exec(labelA);
    const matchB = /Photo\s+(\d+)/.exec(labelB);
    const idxA = matchA ? parseInt(matchA[1], 10) - 1 : photoSlots.indexOf(a);
    const idxB = matchB ? parseInt(matchB[1], 10) - 1 : photoSlots.indexOf(b);
    return idxA - idxB;
  });
}

async function renderFrameToCanvas(
  canvas: HTMLCanvasElement,
  layout: FrameLayout,
  photos: string[],
  photoPositions: Record<string, PhotoPosition>,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(layout.canvas.width * dpr);
  canvas.height = Math.round(layout.canvas.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, layout.canvas.width, layout.canvas.height);
  ctx.fillStyle = layout.canvas.backgroundColor;
  ctx.fillRect(0, 0, layout.canvas.width, layout.canvas.height);

  const orderedNodes = layout.nodes.slice().sort((a, b) => a.zIndex - b.zIndex);
  const sortedPhotoSlots = getSortedPhotoSlots(layout);
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
        drawColorKeyImage(
          ctx,
          image,
          x,
          y,
          node.width,
          node.height,
          fit,
          node.props.colorKey,
        );
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
        drawCoverImage(
          ctx,
          image,
          x,
          y,
          node.width,
          node.height,
          photoPositions[node.id],
        );
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
  const dragRef = useRef<{
    pointerId: number;
    slotId: string;
    startX: number;
    startY: number;
    position: PhotoPosition;
  } | null>(null);
  const photosRef = useRef<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoPositions, setPhotoPositions] = useState<Record<string, PhotoPosition>>({});
  const layout = useMemo(() => (template ? template.frameLayout ?? makeFallbackLayout(template) : null), [template]);
  const photoSlots = useMemo(() => (layout ? getSortedPhotoSlots(layout) : []), [layout]);
  const photoSlotCount = photoSlots.length || template?.photoCount || 0;

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(
    () => () => {
      photosRef.current.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    },
    [],
  );

  useEffect(() => {
    if (!canvasRef.current || !layout) return;
    let cancelled = false;
    renderFrameToCanvas(canvasRef.current, layout, photos, photoPositions).catch(() => {
      if (!cancelled) toast.error("Some images could not be rendered. Check image URL access.");
    });
    return () => {
      cancelled = true;
    };
  }, [layout, photoPositions, photos]);

  const handleSlotFile = (slotIndex: number, file?: File) => {
    if (!file) return;
    const slotId = photoSlots[slotIndex]?.id;
    setPhotos((current) => {
      const next = Array.from(
        { length: photoSlotCount },
        (_, index) => current[index] ?? "",
      );
      if (next[slotIndex]) URL.revokeObjectURL(next[slotIndex]);
      next[slotIndex] = URL.createObjectURL(file);
      return next;
    });
    if (slotId) {
      setPhotoPositions((current) => {
        const next = { ...current };
        delete next[slotId];
        return next;
      });
    }
  };

  const removeSlotPhoto = (slotIndex: number) => {
    const slotId = photoSlots[slotIndex]?.id;
    setPhotos((current) => {
      const next = [...current];
      if (next[slotIndex]) URL.revokeObjectURL(next[slotIndex]);
      next[slotIndex] = "";
      return next;
    });
    if (slotId) {
      setPhotoPositions((current) => {
        const next = { ...current };
        delete next[slotId];
        return next;
      });
    }
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    slotId: string,
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      slotId,
      startX: event.clientX,
      startY: event.clientY,
      position: photoPositions[slotId] ?? CENTER_PHOTO_POSITION,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = (event.clientX - drag.startX) / bounds.width;
    const deltaY = (event.clientY - drag.startY) / bounds.height;
    setPhotoPositions((current) => ({
      ...current,
      [drag.slotId]: {
        x: Math.min(1, Math.max(0, drag.position.x - deltaX)),
        y: Math.min(1, Math.max(0, drag.position.y - deltaY)),
      },
    }));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const downloadPreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !template || !layout) return;
    await renderFrameToCanvas(canvas, layout, photos, photoPositions);
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
            <div
              className="relative mx-auto w-full max-w-full select-none overflow-hidden rounded-md bg-white shadow-xl"
              style={{
                aspectRatio: `${layout.canvas.width} / ${layout.canvas.height}`,
                width: `min(100%, ${layout.canvas.width}px, ${70 * (layout.canvas.width / layout.canvas.height)}vh)`,
              }}
            >
              <canvas
                ref={canvasRef}
                className="block h-full w-full"
                style={{ aspectRatio: `${layout.canvas.width} / ${layout.canvas.height}` }}
              />
              {photoSlots.map((slot, index) =>
                photos[index] ? (
                  <div
                    key={slot.id}
                    className="absolute cursor-grab touch-none active:cursor-grabbing"
                    style={{
                      left: `${(slot.x / layout.canvas.width) * 100}%`,
                      top: `${(slot.y / layout.canvas.height) * 100}%`,
                      width: `${(slot.width / layout.canvas.width) * 100}%`,
                      height: `${(slot.height / layout.canvas.height) * 100}%`,
                      transform: `rotate(${slot.rotation}deg)`,
                    }}
                    title="Geser untuk mengatur posisi foto"
                    onPointerDown={(event) => handlePointerDown(event, slot.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                  />
                ) : null,
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">Upload test photo</div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Pilih foto secara terpisah untuk setiap photo slot.
              </p>
            </div>
            {photos.some(Boolean) ? (
              <div className="flex items-start gap-2 rounded-lg bg-zinc-100 p-3 text-xs leading-5 text-zinc-600">
                <Hand className="mt-0.5 size-4 shrink-0" />
                Geser foto langsung pada frame untuk mengatur area crop. Foto tidak akan di-stretch.
              </div>
            ) : null}
            <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {photoSlots.map((slot, index) => {
                const photo = photos[index] ?? "";
                const label = readString(slot.props.label, `Photo ${index + 1}`);
                return (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2"
                  >
                    <label className="relative grid size-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-500">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={label}
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="size-5 text-zinc-400" />
                      )}
                      <Input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          handleSlotFile(index, event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-800">
                        {label}
                      </p>
                      <label className="mt-1 inline-flex cursor-pointer text-[11px] font-medium text-zinc-500 hover:text-zinc-900">
                        {photo ? "Ganti foto" : "Pilih foto"}
                        <Input
                          className="sr-only"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            handleSlotFile(index, event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {photo ? (
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeSlotPhoto(index)}
                        title={`Hapus ${label}`}
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
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
