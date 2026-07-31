"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  animate,
  type PanInfo,
} from "motion/react";
import { Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { FrameShowcasePreview } from "@/features/public/showcase/frame-showcase-preview";
import { ThemeThumbnail } from "@/features/admin/themes/theme-thumbnail";
import type {
  PublicShowcaseTemplate,
  PublicShowcaseTheme,
  PublicShowcaseCustomItem,
} from "@/server/public/template-showcase-service";

interface ShowcaseSlide {
  type: "frame" | "theme" | "image";
  title: string;
  description: string;
  badge: string;
  frame?: PublicShowcaseTemplate;
  theme?: PublicShowcaseTheme;
  imageUrl?: string;
}

interface CarouselConfig {
  sensitivity: number;
  velocityThreshold: number;
  xOffset: number;
  yOffset: number;
  scaleStep: number;
}

function getConfig(width: number): CarouselConfig {
  if (width < 640) return { sensitivity: 60, velocityThreshold: 300, xOffset: 20, yOffset: 8, scaleStep: 0.04 };
  if (width < 1024) return { sensitivity: 80, velocityThreshold: 400, xOffset: 28, yOffset: 12, scaleStep: 0.06 };
  return { sensitivity: 100, velocityThreshold: 500, xOffset: 36, yOffset: 16, scaleStep: 0.07 };
}

function SlideContent({ slide }: { slide: ShowcaseSlide }) {
  if (slide.type === "frame" && slide.frame) {
    return (
      <FrameShowcasePreview
        name={slide.frame.name}
        accentColor={slide.frame.accentColor}
        frameImageUrl={slide.frame.frameImageUrl}
        frameLayout={slide.frame.frameLayout}
      />
    );
  }
  if (slide.type === "theme" && slide.theme) {
    return (
      <ThemeThumbnail
        schema={slide.theme.schema}
        className="max-w-xl shadow-[0_24px_55px_rgba(15,23,42,0.16)]"
      />
    );
  }
  if (slide.type === "image" && slide.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={slide.imageUrl}
        alt={slide.title}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    );
  }
  return null;
}

function CardLayer({
  slide,
  index,
  current,
  total,
  dragX,
  config,
}: {
  slide: ShowcaseSlide;
  index: number;
  current: number;
  total: number;
  dragX: number;
  config: CarouselConfig;
}) {
  const offset = index - current;
  const absOffset = Math.abs(offset);
  if (absOffset > 2) return null;

  const x = offset * config.xOffset + (absOffset === 0 ? dragX * 0.3 : 0);
  const y = absOffset * config.yOffset;
  const scale = 1 - absOffset * config.scaleStep;
  const zIndex = total - absOffset;
  const opacity = absOffset > 1 ? 0.6 : 1;

  return (
    <motion.div
      animate={{ x, y, scale, opacity }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      style={{ zIndex }}
      className="absolute inset-0 overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_rgba(0,53,123,0.10)]"
    >
      <div className="flex h-full flex-col">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#eef3ff] p-6">
          <SlideContent slide={slide} />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">{slide.title}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{slide.description}</p>
          </div>
          <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#00357B]">
            {slide.badge}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function ShowcaseHeroCarousel({
  templates,
  themes,
  customItems,
}: {
  templates: PublicShowcaseTemplate[];
  themes: PublicShowcaseTheme[];
  customItems: PublicShowcaseCustomItem[];
}) {
  const slides: ShowcaseSlide[] = [
    ...templates.map((t) => ({
      type: "frame" as const,
      title: t.name,
      description: t.tagline || "Frame pilihan POSKART",
      badge: `${t.photoCount} foto`,
      frame: t,
    })),
    ...themes.map((th) => ({
      type: "theme" as const,
      title: th.name,
      description: "Theme photobooth POSKART",
      badge: "Theme",
      theme: th,
    })),
    ...customItems.map((c) => ({
      type: "image" as const,
      title: c.title,
      description: c.description || "Referensi visual kolaborasi",
      badge: c.category,
      imageUrl: c.imageUrl,
    })),
  ];

  const [current, setCurrent] = React.useState(0);
  const [dragX, setDragX] = React.useState(0);
  const [config, setConfig] = React.useState<CarouselConfig>(getConfig(1024));
  const motionDragX = useMotionValue(0);

  React.useEffect(() => {
    const update = () => setConfig(getConfig(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const goTo = React.useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(slides.length - 1, index)));
      animate(motionDragX, 0, { type: "spring", stiffness: 300, damping: 30 });
      setDragX(0);
    },
    [motionDragX, slides.length],
  );

  const handleDrag = (_: PointerEvent, info: PanInfo) => setDragX(info.offset.x);

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    setDragX(0);
    const { offset, velocity } = info;
    const flip =
      Math.abs(velocity.x) > config.velocityThreshold ||
      Math.abs(offset.x) > config.sensitivity;
    if (flip) {
      goTo(offset.x < 0 ? current + 1 : current - 1);
    } else {
      animate(motionDragX, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  if (!slides.length) {
    return (
      <div className="flex h-[460px] flex-col items-center justify-center rounded-[32px] border border-blue-100 bg-white text-center">
        <Images className="mx-auto size-10 text-blue-200" />
        <p className="mt-4 text-sm font-semibold text-zinc-700">Showcase sedang disiapkan</p>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Koleksi visual akan segera tersedia pada halaman ini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full select-none flex-col items-center gap-5">
      {/* Card stack */}
      <div className="relative w-full" style={{ aspectRatio: "3/4", maxHeight: "560px" }}>
        {slides.map((slide, i) => (
          <CardLayer
            key={i}
            slide={slide}
            index={i}
            current={current}
            total={slides.length}
            dragX={dragX}
            config={config}
          />
        ))}
        {/* Invisible drag surface */}
        <motion.div
          className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          style={{ x: motionDragX }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Dots */}
      <div className="flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={cn(
              "rounded-full transition-all duration-200",
              i === current
                ? "h-1.5 w-5 bg-[#00357B]"
                : "h-1.5 w-1.5 bg-zinc-300 hover:bg-zinc-400",
            )}
          />
        ))}
      </div>
    </div>
  );
}
