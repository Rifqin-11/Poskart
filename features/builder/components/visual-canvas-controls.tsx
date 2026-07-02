"use client";

import { useRef, useState } from "react";
import { Film, Grid2X2, Image as ImageIcon, Smartphone, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ColorField, PanelSection } from "@/features/builder/components/visual-properties-primitives";
import {
  BUILDER_MEDIA_ACCEPT,
  BUILDER_MEDIA_HELP_TEXT,
  getBuilderMediaValidationError,
  uploadBuilderMedia,
} from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderCanvas } from "@/types/builder";

export function CanvasControls() {
  const canvas = useBuilderStore((state) => state.canvas);
  const selectedId = useBuilderStore((state) => state.selectedId);
  const nodes = useBuilderStore((state) => state.nodes);
  const selectedNode = nodes.find((node) => node.id === selectedId);
  const activePage = useBuilderStore((state) => state.activePage);
  const updateCanvas = useBuilderStore((state) => state.updateCanvas);
  const setPageBackground = useBuilderStore((state) => state.setPageBackground);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolved background for the current page
  const pageBg = canvas.pageBackgrounds?.[activePage];
  const bgImage = pageBg?.image;
  const bgVideo = pageBg?.video;

  const applyOrientation = (orientation: "portrait" | "landscape") => {
    updateCanvas(
      orientation === "portrait"
        ? { orientation, width: 1080, height: 1920 }
        : { orientation, width: 1920, height: 1080 },
    );
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const validationError = getBuilderMediaValidationError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadBuilderMedia(file);
      if (result.type === "video") {
        setPageBackground(activePage, { image: undefined, video: result.url });
      } else {
        setPageBackground(activePage, { image: result.url, video: undefined });
      }
      toast.success(
        `${result.type === "video" ? "Video" : "Image"} background set for ${activePage}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearBg = () =>
    setPageBackground(activePage, { image: undefined, video: undefined });
  const hasBg = !!(bgImage || bgVideo);

  const DEVICE_PRESETS = [
    { label: "— Custom —", w: 0, h: 0 },
    { label: "Redmi Pad 2", w: 2560, h: 1600 },
    { label: "Redmi Pad SE", w: 1920, h: 1200 },
    { label: "iPad 10th Gen", w: 1668, h: 2388 },
    { label: "iPad Air M2", w: 1640, h: 2360 },
    { label: 'iPad Pro 11"', w: 1668, h: 2420 },
    { label: "Samsung Tab A7", w: 1200, h: 2000 },
    { label: "Samsung Tab A8", w: 1340, h: 2000 },
    { label: "Phone FHD+", w: 1080, h: 2400 },
  ];

  // Find active preset (match either portrait or landscape orientation of that device)
  const activePreset = DEVICE_PRESETS.find(
    (p) =>
      p.w > 0 &&
      ((canvas.width === p.w && canvas.height === p.h) ||
        (canvas.width === p.h && canvas.height === p.w)),
  );
  const selectedPresetValue = activePreset?.label ?? "";

  const applyPreset = (label: string) => {
    const p = DEVICE_PRESETS.find((d) => d.label === label);
    if (!p || p.w === 0) return;
    // Apply in current orientation preference
    const isLandscape = canvas.orientation === "landscape";
    const w = isLandscape ? Math.max(p.w, p.h) : Math.min(p.w, p.h);
    const h = isLandscape ? Math.min(p.w, p.h) : Math.max(p.w, p.h);
    updateCanvas({
      width: w,
      height: h,
      orientation: w >= h ? "landscape" : "portrait",
    });
  };

  const applyOrientationWithPreset = (
    orientation: "portrait" | "landscape",
  ) => {
    if (activePreset && activePreset.w > 0) {
      const w =
        orientation === "landscape"
          ? Math.max(activePreset.w, activePreset.h)
          : Math.min(activePreset.w, activePreset.h);
      const h =
        orientation === "landscape"
          ? Math.min(activePreset.w, activePreset.h)
          : Math.max(activePreset.w, activePreset.h);
      updateCanvas({ width: w, height: h, orientation });
    } else {
      applyOrientation(orientation);
    }
  };

  return (
    <PanelSection
      key={selectedNode ? "collapsed" : "expanded"}
      title="Canvas"
      icon={<Smartphone className="size-3.5 text-zinc-500" />}
      defaultOpen={!selectedNode}
    >
      {/* Canvas Mode toggle */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-zinc-500">Mode</div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-0.5">
          <button
            onClick={() => updateCanvas({ overlayMode: false })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              !canvas.overlayMode
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Type className="size-3.5" /> Custom
          </button>
          <button
            onClick={() => updateCanvas({ overlayMode: true })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              canvas.overlayMode
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Grid2X2 className="size-3.5" /> Overlay
          </button>
        </div>
        {canvas.overlayMode && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
            <strong>Overlay mode</strong> — set semantic roles so Flutter knows
            where each widget goes.
          </div>
        )}
      </div>

      {/* Device preset dropdown */}
      <label className="block text-xs font-medium text-zinc-500">
        Device
        <Select
          className="mt-1"
          value={selectedPresetValue}
          onChange={(e) => applyPreset(e.target.value)}
        >
          {DEVICE_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
              {p.w > 0 ? ` (${p.w}×${p.h})` : ""}
            </option>
          ))}
        </Select>
      </label>

      {/* Orientation */}
      <label className="block text-xs font-medium text-zinc-500">
        Orientation
        <Select
          className="mt-1"
          value={canvas.orientation}
          onChange={(e) =>
            applyOrientationWithPreset(
              e.target.value as "portrait" | "landscape",
            )
          }
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </Select>
      </label>

      {/* Manual size */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          W px
          <Input
            className="mt-1"
            min={240}
            max={3840}
            type="number"
            value={canvas.width}
            onChange={(e) => updateCanvas({ width: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          H px
          <Input
            className="mt-1"
            min={240}
            max={3840}
            type="number"
            value={canvas.height}
            onChange={(e) => updateCanvas({ height: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Page Transitions */}
      <div className="space-y-2 border-t border-zinc-100 pt-3 mt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Film className="size-3.5" /> Page Transitions
        </div>

        <label className="block text-xs font-medium text-zinc-500">
          Transition Effect
          <Select
            className="mt-1"
            value={canvas.transitionType ?? "fade"}
            onChange={(e) =>
              updateCanvas({
                transitionType: e.target.value as NonNullable<
                  BuilderCanvas["transitionType"]
                >,
              })
            }
          >
            <option value="fade">Fade Dissolve</option>
            <option value="slide-horizontal">Slide Horizontal (Push)</option>
            <option value="slide-vertical">Slide Vertical (Stack)</option>
            <option value="zoom">Zoom Scale</option>
            <option value="none">No Transition (Instant)</option>
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-500">
          Duration: {canvas.transitionDurationMs ?? 300}ms
          <Slider
            className="mt-1"
            min={100}
            max={2000}
            step={50}
            value={canvas.transitionDurationMs ?? 300}
            onChange={(e) =>
              updateCanvas({ transitionDurationMs: Number(e.target.value) })
            }
          />
        </label>

        <label className="block text-xs font-medium text-zinc-500">
          Animation Curve
          <Select
            className="mt-1"
            value={canvas.transitionCurve ?? "easeInOut"}
            onChange={(e) =>
              updateCanvas({
                transitionCurve: e.target.value as NonNullable<
                  BuilderCanvas["transitionCurve"]
                >,
              })
            }
          >
            <option value="easeInOut">Ease In Out (Smooth)</option>
            <option value="easeIn">Ease In (Accelerate)</option>
            <option value="easeOut">Ease Out (Decelerate)</option>
            <option value="linear">Linear (Constant)</option>
            <option value="bounce">Bounce Physics (Elastic)</option>
          </Select>
        </label>
      </div>

      {/* App background */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-zinc-500">Background</div>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 capitalize">
            {activePage}
          </span>
        </div>

        {bgVideo ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            <video
              src={bgVideo}
              autoPlay
              loop
              muted
              playsInline
              className="h-24 w-full object-cover"
            />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <Film className="size-2.5" /> VIDEO
              </span>
              <button
                onClick={clearBg}
                className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : bgImage ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgImage} alt="bg" className="h-24 w-full object-cover" />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <ImageIcon className="size-2.5" /> IMAGE
              </span>
              <button
                onClick={clearBg}
                className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : null}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed py-3 text-center transition-colors",
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-zinc-200 bg-zinc-50 hover:border-zinc-300",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={BUILDER_MEDIA_ACCEPT}
            disabled={uploading}
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Upload className="size-3.5 text-zinc-400" />
          <div className="text-[10px] font-medium text-zinc-600">
            {uploading ? "Uploading…" : hasBg ? "Replace" : "Upload design"}
          </div>
          <div className="text-[9px] text-zinc-400">
            {BUILDER_MEDIA_HELP_TEXT}
          </div>
        </div>

        <label className="block text-xs font-medium text-zinc-500">
          Or paste URL
          <Input
            className="mt-1 font-mono text-[11px]"
            placeholder="https://…"
            value={bgImage ?? bgVideo ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const isVideo = /\.(mp4|mov|m4v|webm)($|\?)/i.test(v);
              if (isVideo)
                setPageBackground(activePage, {
                  video: v || undefined,
                  image: undefined,
                });
              else
                setPageBackground(activePage, {
                  image: v || undefined,
                  video: undefined,
                });
            }}
          />
        </label>
      </div>

      {!canvas.overlayMode && (
        <ColorField
          label="Background color"
          value={canvas.backgroundColor ?? "#ffffff"}
          onChange={(value) => updateCanvas({ backgroundColor: value })}
        />
      )}
    </PanelSection>
  );
}
