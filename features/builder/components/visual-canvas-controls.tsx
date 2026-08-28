"use client";

import { useState } from "react";
import {
  Film,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { ImageUploadDropzone } from "@/components/ui/image-upload-dropzone";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ColorKeyControls } from "@/features/builder/components/color-key-controls";
import { AssetPreview } from "@/features/builder/components/asset-preview";
import {
  BUILDER_MEDIA_ACCEPT,
  BUILDER_MEDIA_HELP_TEXT,
  getBuilderMediaValidationError,
  uploadBuilderMedia,
  type BuilderMediaUploadStatus,
} from "@/lib/services/storage-service";
import { normalizeAssetUrl } from "@/lib/assets/asset-url";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderCanvas } from "@/types/builder";

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

export function CanvasControls({ activeTab }: { activeTab?: "device" | "background" | "motion" }) {
  const canvas = useBuilderStore((state) => state.canvas);
  const activePage = useBuilderStore((state) => state.activePage);
  const updateCanvas = useBuilderStore((state) => state.updateCanvas);
  const setPageBackground = useBuilderStore((state) => state.setPageBackground);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] =
    useState<BuilderMediaUploadStatus | null>(null);

  const pageBg = canvas.pageBackgrounds?.[activePage];
  const bgImage = normalizeAssetUrl(pageBg?.image);
  const bgVideo = normalizeAssetUrl(pageBg?.video);
  const hasBg = !!(bgImage || bgVideo);

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
    const isLandscape = canvas.orientation === "landscape";
    const w = isLandscape ? Math.max(p.w, p.h) : Math.min(p.w, p.h);
    const h = isLandscape ? Math.min(p.w, p.h) : Math.max(p.w, p.h);
    updateCanvas({ width: w, height: h, orientation: w >= h ? "landscape" : "portrait" });
  };

  const applyOrientationWithPreset = (orientation: "portrait" | "landscape") => {
    if (activePreset && activePreset.w > 0) {
      const w = orientation === "landscape"
        ? Math.max(activePreset.w, activePreset.h)
        : Math.min(activePreset.w, activePreset.h);
      const h = orientation === "landscape"
        ? Math.min(activePreset.w, activePreset.h)
        : Math.max(activePreset.w, activePreset.h);
      updateCanvas({ width: w, height: h, orientation });
    } else {
      updateCanvas(
        orientation === "portrait"
          ? { orientation, width: 1080, height: 1920 }
          : { orientation, width: 1920, height: 1080 },
      );
    }
  };

  const handleFile = async (file: File) => {
    const validationError = getBuilderMediaValidationError(file);
    if (validationError) throw new Error(validationError);
    setUploading(true);
    try {
      const result = await uploadBuilderMedia(file, {
        onStatus: setUploadStatus,
      });
      if (result.type === "video") {
        setPageBackground(activePage, { image: undefined, video: result.url, colorKey: undefined });
      } else {
        setPageBackground(activePage, { image: result.url, video: undefined });
      }
      toast.success(`${result.type === "video" ? "Video" : "Image"} background set for ${activePage}`);
    } finally {
      setUploadStatus(null);
      setUploading(false);
    }
  };

  const clearBg = () => setPageBackground(activePage, { image: undefined, video: undefined, colorKey: undefined });

  const tab = activeTab ?? "device";

  if (tab === "device") {
    return (
      <div className="space-y-3">
        <label className="block text-xs font-medium text-zinc-500">
          Device
          <Select className="mt-1" value={selectedPresetValue} onChange={(e) => applyPreset(e.target.value)}>
            {DEVICE_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}{p.w > 0 ? ` (${p.w}×${p.h})` : ""}
              </option>
            ))}
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-500">
          Orientation
          <Select
            className="mt-1"
            value={canvas.orientation}
            onChange={(e) => applyOrientationWithPreset(e.target.value as "portrait" | "landscape")}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </Select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-zinc-500">
            W px
            <Input className="mt-1" min={240} max={3840} type="number" value={canvas.width}
              onChange={(e) => updateCanvas({ width: Number(e.target.value) })} />
          </label>
          <label className="text-xs font-medium text-zinc-500">
            H px
            <Input className="mt-1" min={240} max={3840} type="number" value={canvas.height}
              onChange={(e) => updateCanvas({ height: Number(e.target.value) })} />
          </label>
        </div>
      </div>
    );
  }

  if (tab === "background") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-zinc-500">Background</div>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 capitalize">
            {activePage}
          </span>
        </div>

        {bgVideo ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            <video src={bgVideo} autoPlay loop muted playsInline className="h-24 w-full object-cover" />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <Film className="size-2.5" /> VIDEO
              </span>
              <button onClick={clearBg} className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500">
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : bgImage ? (
          <div className="relative overflow-hidden rounded-lg border border-zinc-200">
            <AssetPreview src={bgImage} alt="Background preview" className="h-24 w-full object-cover" />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                <ImageIcon className="size-2.5" /> IMAGE
              </span>
              <button onClick={clearBg} className="rounded bg-red-500/80 p-0.5 text-white hover:bg-red-500">
                <X className="size-3" />
              </button>
            </div>
          </div>
        ) : null}

        <ImageUploadDropzone
          accept={BUILDER_MEDIA_ACCEPT}
          label={hasBg ? "Drop to replace background" : "Drop background media"}
          helperText={BUILDER_MEDIA_HELP_TEXT}
          busyLabel={uploadStatus?.message ?? "Uploading media..."}
          busyDetail={uploadStatus?.detail}
          progress={uploadStatus?.progress}
          disabled={uploading}
          validate={getBuilderMediaValidationError}
          onUpload={handleFile}
        />

        <label className="block text-xs font-medium text-zinc-500">
          Or paste URL
          <Input
            className="mt-1 font-mono text-[11px]"
            placeholder="https://…"
            value={bgImage ?? bgVideo ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const isVideo = /\.(mp4|mov|m4v|webm)($|\?)/i.test(v);
              if (isVideo) setPageBackground(activePage, { video: v || undefined, image: undefined, colorKey: undefined });
              else setPageBackground(activePage, { image: v || undefined, video: undefined });
            }}
          />
        </label>

        {bgImage && !bgVideo ? (
          <ColorKeyControls
            value={pageBg?.colorKey}
            onChange={(colorKey) => setPageBackground(activePage, { colorKey })}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-zinc-500">
        Transition effect
        <Select
          className="mt-1"
          value={canvas.transitionType ?? "fade"}
          onChange={(e) => updateCanvas({ transitionType: e.target.value as NonNullable<BuilderCanvas["transitionType"]> })}
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
          onChange={(e) => updateCanvas({ transitionDurationMs: Number(e.target.value) })}
        />
      </label>

      <label className="block text-xs font-medium text-zinc-500">
        Animation curve
        <Select
          className="mt-1"
          value={canvas.transitionCurve ?? "easeInOut"}
          onChange={(e) => updateCanvas({ transitionCurve: e.target.value as NonNullable<BuilderCanvas["transitionCurve"]> })}
        >
          <option value="easeInOut">Ease In Out (Smooth)</option>
          <option value="easeIn">Ease In (Accelerate)</option>
          <option value="easeOut">Ease Out (Decelerate)</option>
          <option value="linear">Linear (Constant)</option>
          <option value="bounce">Bounce Physics (Elastic)</option>
        </Select>
      </label>
    </div>
  );
}
