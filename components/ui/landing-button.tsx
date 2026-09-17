/**
 * Landing page button with a liquid-glass treatment.
 *
 * Every variant shares the same construction: a white edge border, a radial
 * gradient that lightens toward the centre, and an inner highlight.
 *
 * Variants:
 * - primary:      soft electric-blue radial gradient, for both light and blue sections
 * - secondary:    neutral grey, for white/light sections
 * - outlineLight: transparent glass with white edge, for blue/dark sections
 *
 * Use `asChild` to render a Next.js <Link> with the same visual treatment.
 */
import { Slot } from "radix-ui";
import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface LandingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outlineLight";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const base =
  "relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-semibold tracking-tight transition-[background-color,filter,transform,box-shadow] duration-200 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(140%_80%_at_50%_0%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_55%)] before:content-[''] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#014EB4] disabled:pointer-events-none disabled:opacity-60 active:translate-y-px";

const sizes = {
  sm: "h-10 rounded-xl px-4 text-sm",
  md: "h-12 rounded-xl px-6 text-base",
  lg: "h-14 rounded-2xl px-8 text-base",
};

const variants = {
  primary:
    "border border-t-transparent border-b-white/60 bg-[#014EB4] text-white shadow-[0_10px_24px_rgba(1,78,180,0.3)] hover:bg-[#00357B]",
  secondary:
    "border border-black/5 bg-[#E9EBEF] text-[#1F2937] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_10px_rgba(15,23,42,0.08)] hover:bg-[#DDE1E6]",
  outlineLight:
    "border border-t-transparent border-b-white/60 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
};

export function LandingButton({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: LandingButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      type={asChild ? undefined : "button"}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}
