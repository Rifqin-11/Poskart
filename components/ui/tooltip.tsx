import { cn } from "@/lib/utils";

export function Tooltip({
  label,
  children,
  className,
  placement = "top",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  placement?: "top" | "left";
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        className={cn(
          "pointer-events-none absolute z-50 hidden w-max max-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-5 text-zinc-700 shadow-xl group-hover:block group-focus-within:block",
          placement === "left"
            ? "right-full top-1/2 mr-2 -translate-y-1/2"
            : "bottom-full right-0 mb-2 -translate-y-1",
        )}
      >
        {label}
      </span>
    </span>
  );
}
