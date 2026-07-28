"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureTourStep = {
  selectors: string[];
  title: string;
  description: string;
};

type Spotlight = Pick<
  DOMRect,
  "top" | "right" | "bottom" | "left" | "width" | "height"
>;

function findVisibleTarget(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return element;
  }

  return null;
}

export function FeatureGuidedTour({
  open,
  title,
  steps,
  onClose,
  onComplete,
  onBeforeStepChange,
  initialStepIndex = 0,
}: {
  open: boolean;
  title: string;
  steps: FeatureTourStep[];
  onClose: () => void;
  onComplete: () => void;
  onBeforeStepChange?: (nextStepIndex: number) => void;
  initialStepIndex?: number;
}) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const step = steps[stepIndex];

  useLayoutEffect(() => {
    if (!open || !step) return;

    const updateSpotlight = () => {
      setSpotlight(
        findVisibleTarget(step.selectors)?.getBoundingClientRect() ?? null,
      );
    };

    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const popoverStyle = useMemo(() => {
    if (typeof window === "undefined") return { left: 16, top: 16, width: 344 };

    const width = Math.min(344, window.innerWidth - 32);
    const popoverHeight = 320;
    if (!spotlight) {
      return {
        left: Math.max(16, (window.innerWidth - width) / 2),
        top: Math.max(16, (window.innerHeight - popoverHeight) / 2),
        width,
      };
    }

    const left = Math.min(
      Math.max(16, spotlight.left),
      window.innerWidth - width - 16,
    );
    const below = spotlight.bottom + 16;
    const top =
      below + popoverHeight <= window.innerHeight - 16
        ? below
        : Math.max(16, spotlight.top - popoverHeight - 16);

    return { left, top, width };
  }, [spotlight]);

  if (!open || !step) return null;

  const isLastStep = stepIndex === steps.length - 1;
  const changeStep = (nextStepIndex: number) => {
    onBeforeStepChange?.(nextStepIndex);
    setStepIndex(nextStepIndex);
  };

  return (
    <div
      className="fixed inset-0 z-[120]"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} tutorial`}
    >
      {spotlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-2 ring-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.5),0_12px_32px_rgba(0,53,123,0.26)]"
          style={{
            top: spotlight.top - 6,
            left: spotlight.left - 6,
            width: spotlight.width + 12,
            height: spotlight.height + 12,
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-slate-950/50" />
      )}

      <section
        className="fixed rounded-3xl border border-blue-100 bg-white p-5 text-zinc-950 shadow-2xl shadow-blue-950/20"
        style={popoverStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-9 place-items-center rounded-2xl bg-blue-50 text-[#00357B]">
            <Sparkles className="size-4" />
          </span>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            onClick={onClose}
            aria-label="Skip tutorial"
            title="Skip tutorial"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00357B]">
          {title} · {stepIndex + 1} of {steps.length}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {step.description}
        </p>

        <div
          className="mt-5 flex gap-1.5"
          aria-label={`Step ${stepIndex + 1} of ${steps.length}`}
        >
          {steps.map((tourStep, index) => (
            <span
              key={tourStep.title}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= stepIndex ? "bg-[#00357B]" : "bg-blue-100",
              )}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950"
            onClick={onClose}
          >
            Skip
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                onClick={() => changeStep(stepIndex - 1)}
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#00357B] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#014EB4]"
              onClick={() => {
                if (isLastStep) {
                  onComplete();
                  return;
                }
                changeStep(stepIndex + 1);
              }}
            >
              {isLastStep ? "Finish" : "Next"}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
