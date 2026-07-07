"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  applyColorKeyToImageData,
  drawImageFitted,
  normalizeColorKey,
} from "@/lib/color-key";
import { cn } from "@/lib/utils";
import { getColorKeyImageSourceCandidates } from "@/features/builder/utils/color-key-image-source";
import type { ColorKeySettings } from "@/types/color-key";

type ColorKeyImageProps = {
  src: string;
  alt?: string;
  fit?: "cover" | "contain" | "fill" | string;
  radius?: number;
  colorKey?: ColorKeySettings | unknown;
  className?: string;
  style?: CSSProperties;
};

export function ColorKeyImage({
  src,
  alt = "",
  fit = "cover",
  radius = 0,
  colorKey,
  className,
  style,
}: ColorKeyImageProps) {
  const settings = useMemo(() => normalizeColorKey(colorKey), [colorKey]);
  const shouldProcess = settings.enabled;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!shouldProcess) {
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !src) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const render = async () => {
      const width = Math.max(1, Math.round(container.clientWidth));
      const height = Math.max(1, Math.round(container.clientHeight));
      if (width <= 0 || height <= 0) return;

      let lastError: unknown = null;
      for (const candidate of getColorKeyImageSourceCandidates(src)) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        image.src = candidate;

        try {
          await image.decode();
          if (cancelled) return;

          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, width, height);
          drawImageFitted(ctx, image, width, height, fit);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          applyColorKeyToImageData(imageData, settings);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.putImageData(imageData, 0, 0);
          setFailed(false);
          return;
        } catch (error) {
          lastError = error;
        }
      }

      if (!cancelled) {
        console.warn("[color-key-image] unable to process image", lastError);
        setFailed(true);
      }
    };

    void render();
    resizeObserver = new ResizeObserver(() => {
      void render();
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [fit, settings, shouldProcess, src]);

  if (!shouldProcess || failed) {
    return (
      <div
        ref={containerRef}
        aria-label={alt}
        role={alt ? "img" : undefined}
        className={cn("bg-center bg-no-repeat", className)}
        style={{
          ...style,
          borderRadius: radius,
          backgroundImage: `url(${src})`,
          backgroundSize: fit === "fill" ? "100% 100%" : fit,
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label={alt}
      role={alt ? "img" : undefined}
      className={cn("overflow-hidden", className)}
      style={{ ...style, borderRadius: radius }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
