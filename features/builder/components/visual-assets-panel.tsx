"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Grid2X2, Image, List, Plus, Type, X } from "lucide-react";
import { ImageUploadDropzone } from "@/components/ui/image-upload-dropzone";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getBuilderImageValidationError,
  uploadBuilderImage,
  BUILDER_IMAGE_ACCEPT,
} from "@/lib/services/storage-service";
import { useBuilderStore } from "@/stores/builder-store";
import { cn } from "@/lib/utils";
import type { BuilderCanvas } from "@/types/builder";

type AssetView = "grid" | "list";

export function VisualAssetsPanel({
  onInsertImage,
}: {
  onInsertImage: (url: string) => void;
}) {
  const canvas = useBuilderStore((s) => s.canvas);
  const updateCanvas = useBuilderStore((s) => s.updateCanvas);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0 divide-y divide-zinc-100">
          <FontsSection canvas={canvas} updateCanvas={updateCanvas} />
          <ImagesSection
            canvas={canvas}
            updateCanvas={updateCanvas}
            onInsertImage={onInsertImage}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Fonts section ─── */

function FontsSection({
  canvas,
  updateCanvas,
}: {
  canvas: BuilderCanvas;
  updateCanvas: (patch: Partial<BuilderCanvas>) => void;
}) {
  const [fontName, setFontName] = useState("");
  const [fontUrl, setFontUrl] = useState("");
  const customFonts = canvas.customFonts ?? [];

  const load = () => {
    const name = fontName.trim();
    const url = fontUrl.trim();
    if (!name || !url) return;
    const id = `custom-font-${name}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
    if (!customFonts.find((f) => f.name === name)) {
      updateCanvas({ customFonts: [...customFonts, { name, url }] });
    }
    setFontName("");
    setFontUrl("");
  };

  const remove = (name: string) => {
    updateCanvas({ customFonts: customFonts.filter((f) => f.name !== name) });
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Type className="size-3.5 text-zinc-400" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Fonts
        </span>
      </div>

      {customFonts.length > 0 && (
        <div className="space-y-1">
          {customFonts.map((font) => (
            <div
              key={font.name}
              className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-2 py-1.5"
            >
              <span
                className="truncate text-xs text-zinc-700"
                style={{ fontFamily: `'${font.name}', sans-serif` }}
              >
                {font.name}
              </span>
              <button
                type="button"
                onClick={() => remove(font.name)}
                className="ml-2 shrink-0 text-zinc-300 hover:text-red-500 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 space-y-1.5">
        <div className="text-[10px] font-semibold text-zinc-500">Import font</div>
        <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-[10px] leading-[1.5] text-amber-800">
          Nama font harus <span className="font-semibold">persis sama</span> dengan nama{" "}
          <code className="rounded bg-amber-100 px-0.5">font-family</code> di CSS-nya.
          Contoh: jika URL Google Fonts adalah{" "}
          <code className="rounded bg-amber-100 px-0.5">?family=Playfair+Display</code>,
          maka isi Name dengan <span className="font-semibold">Playfair Display</span>.
        </div>
        <label className="block text-[10px] text-zinc-500">
          Name
          <Input
            className="mt-0.5"
            placeholder="e.g. Playfair Display"
            value={fontName}
            onChange={(e) => setFontName(e.target.value)}
          />
        </label>
        <label className="block text-[10px] text-zinc-500">
          CSS URL
          <Input
            className="mt-0.5"
            placeholder="https://fonts.googleapis.com/css2?family=Playfair+Display"
            value={fontUrl}
            onChange={(e) => setFontUrl(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={!fontName.trim() || !fontUrl.trim()}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded bg-zinc-800 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
        >
          <Plus className="size-3" />
          Load font
        </button>
      </div>
    </div>
  );
}

/* ─── Images section ─── */

function ImagesSection({
  canvas,
  updateCanvas,
  onInsertImage,
}: {
  canvas: BuilderCanvas;
  updateCanvas: (patch: Partial<BuilderCanvas>) => void;
  onInsertImage: (url: string) => void;
}) {
  const [view, setView] = useState<AssetView>("grid");
  const images = canvas.canvasImages ?? [];

  const handleUpload = async (file: File) => {
    const err = getBuilderImageValidationError(file);
    if (err) throw new Error(err);
    const result = await uploadBuilderImage(file);
    updateCanvas({
      canvasImages: [...images, { url: result.url, name: file.name }],
    });
  };

  const remove = (url: string) => {
    updateCanvas({ canvasImages: images.filter((img) => img.url !== url) });
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Image className="size-3.5 text-zinc-400" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Images
          </span>
          {images.length > 0 && (
            <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-500">
              {images.length}
            </span>
          )}
        </div>
        {images.length > 0 && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "rounded p-0.5 transition-colors",
                view === "grid" ? "text-zinc-900" : "text-zinc-300 hover:text-zinc-500",
              )}
            >
              <Grid2X2 className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded p-0.5 transition-colors",
                view === "list" ? "text-zinc-900" : "text-zinc-300 hover:text-zinc-500",
              )}
            >
              <List className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Upload */}
      <ImageUploadDropzone
        compact
        accept={BUILDER_IMAGE_ACCEPT}
        label="Drop image or click to browse"
        helperText="JPG, PNG, WebP, GIF, or SVG · max 8 MB"
        validate={getBuilderImageValidationError}
        onUpload={handleUpload}
      />

      {/* Asset list/grid */}
      {images.length === 0 ? (
        <div className="text-center text-[10px] text-zinc-400 py-2">
          No images yet. Upload one above.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-3 gap-1.5">
          {images.map((img) => (
            <div key={img.url} className="group relative aspect-square">
              <button
                type="button"
                onClick={() => onInsertImage(img.url)}
                className="h-full w-full overflow-hidden rounded-md border border-zinc-200 bg-zinc-100"
                title={img.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name}
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
                />
              </button>
              <button
                type="button"
                onClick={() => remove(img.url)}
                className="absolute right-0.5 top-0.5 hidden rounded bg-black/60 p-0.5 text-white group-hover:flex"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {images.map((img) => (
            <div
              key={img.url}
              className="flex items-center gap-2 rounded-md border border-zinc-100 bg-zinc-50 px-2 py-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.name}
                className="size-7 shrink-0 rounded border border-zinc-200 object-cover"
              />
              <button
                type="button"
                onClick={() => onInsertImage(img.url)}
                className="min-w-0 flex-1 truncate text-left text-[10px] text-zinc-600 hover:text-zinc-900"
              >
                {img.name}
              </button>
              <button
                type="button"
                onClick={() => remove(img.url)}
                className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
