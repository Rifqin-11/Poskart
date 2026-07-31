"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  animate,
  type PanInfo,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface StackedSlide {
  image?: string | null;
  title: string;
  description?: string | null;
  badge?: string | null;
  renderContent?: () => React.ReactNode;
}

interface CarouselConfig {
  sensitivity: number;
  velocityThreshold: number;
  xOffset: number;
  yOffset: number;
  rotation: number;
  scaleStep: number;
}

function getConfig(width: number): CarouselConfig {
  if (width < 640) {
    return { sensitivity: 60, velocityThreshold: 300, xOffset: 24, yOffset: 10, rotation: 4, scaleStep: 0.05 };
  }
  if (width < 1024) {
    return { sensitivity: 80, velocityThreshold: 400, xOffset: 32, yOffset: 14, rotation: 5, scaleStep: 0.07 };
  }
  return { sensitivity: 100, velocityThreshold: 500, xOffset: 40, yOffset: 18, rotation: 6, scaleStep: 0.08 };
}

interface CardLayerProps {
  slide: StackedSlide;
  index: number;
  current: number;
  total: number;
  dragProgress: number;
  isDragging: boolean;
  config: CarouselConfig;
}

function CardLayer({ slide, index, current, total, dragProgress, isDragging, config }: CardLayerProps) {
  const offset = index - current;
  const absOffset = Math.abs(offset);

  if (absOffset > 3) return null;

  const x = offset * config.xOffset + (isDragging ? dragProgress * (1 - absOffset * 0.3) : 0);
  const y = absOffset * config.yOffset;
  const rotate = offset * config.rotation * 0.4 + (isDragging && offset === 0 ? dragProgress / 30 : 0);
  const scale = 1 - absOffset * config.scaleStep;
  const zIndex = total - absOffset;
  const opacity = absOffset > 2 ? 0 : 1 - absOffset * 0.15;

  return (
    <motion.div
      animate={{ x, y, rotate, scale, opacity }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ zIndex }}
      className="absolute inset-0 overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_20px_60px_rgba(0,53,123,0.12)]"
    >
      <div className="relative flex h-full flex-col">
        {/* Image or custom content area */}
        <div className="relative flex-1 overflow-hidden bg-[#eef3ff]">
          {slide.renderContent ? (
            <div className="flex h-full items-center justify-center p-6">
              {slide.renderContent()}
            </div>
          ) : slide.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : null}
        </div>
        {/* Footer */}
        {(slide.title || slide.badge) && (
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{slide.title}</p>
              {slide.description && (
                <p className="mt-0.5 truncate text-xs text-zinc-500">{slide.description}</p>
              )}
            </div>
            {slide.badge && (
              <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#00357B]">
                {slide.badge}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface StackedCardCarouselProps {
  slides: StackedSlide[];
  className?: string;
  aspectRatio?: string;
}

export function StackedCardCarousel({ slides, className, aspectRatio = "3/4" }: StackedCardCarouselProps) {
  const [current, setCurrent] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragProgress, setDragProgress] = React.useState(0);
  const [config, setConfig] = React.useState<CarouselConfig>(getConfig(1024));
  const dragX = useMotionValue(0);

  React.useEffect(() => {
    const update = () => setConfig(getConfig(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const goTo = React.useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(slides.length - 1, index)));
      animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
      setDragProgress(0);
    },
    [dragX, slides.length],
  );

  const handleDrag = (_: PointerEvent, info: PanInfo) => {
    setDragProgress(info.offset.x);
  };

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    setDragProgress(0);
    const { offset, velocity } = info;
    const shouldFlip =
      Math.abs(velocity.x) > config.velocityThreshold ||
      Math.abs(offset.x) > config.sensitivity;
    if (shouldFlip) {
      goTo(offset.x < 0 ? current + 1 : current - 1);
    } else {
      animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  if (!slides.length) return null;

  return (
    <div className={cn("flex select-none flex-col items-center gap-5", className)}>
      {/* Card stack */}
      <div className="relative w-full" style={{ aspectRatio, maxHeight: "560px" }}>
        {slides.map((slide, i) => (
          <CardLayer
            key={i}
            slide={slide}
            index={i}
            current={current}
            total={slides.length}
            dragProgress={dragProgress}
            isDragging={isDragging}
            config={config}
          />
        ))}
        {/* Drag surface on top */}
        <motion.div
          className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          style={{ x: dragX }}
          onDragStart={() => setIsDragging(true)}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Dot indicators */}
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
