import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
