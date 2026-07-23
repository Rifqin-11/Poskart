"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type AnimatedNumberFormat = "currency" | "number" | "percentage";

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatAnimatedNumber(value: number, format: AnimatedNumberFormat) {
  if (format === "currency") return formatCurrency(value);
  if (format === "percentage") return `${value.toFixed(1)}%`;
  return numberFormatter.format(value);
}

export function AnimatedNumber({
  value,
  format = "number",
  duration = 650,
}: {
  value: number;
  format?: AnimatedNumberFormat;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const displayValueRef = useRef(0);

  useEffect(() => {
    const targetValue = Number.isFinite(value) ? value : 0;
    const startValue = displayValueRef.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || startValue === targetValue) {
      displayValueRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    const startedAt = performance.now();
    let animationFrame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = startValue + (targetValue - startValue) * easedProgress;

      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      } else {
        displayValueRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, value]);

  return formatAnimatedNumber(displayValue, format);
}
