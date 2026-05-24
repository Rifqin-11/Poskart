import { cn } from "@/lib/utils";

export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-950 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
        {label}
      </span>
    </span>
  );
}
