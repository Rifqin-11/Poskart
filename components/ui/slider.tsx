import * as React from "react";
import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "range", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn("h-2 w-full cursor-pointer accent-zinc-950", className)}
      {...props}
    />
  ),
);
Slider.displayName = "Slider";
