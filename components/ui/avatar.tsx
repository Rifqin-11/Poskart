import { cn } from "@/lib/utils";

export function Avatar({ className, name = "PX" }: { className?: string; name?: string }) {
  return (
    <div
      className={cn(
        "grid size-9 place-items-center rounded-full bg-zinc-950 text-xs font-semibold text-white",
        className,
      )}
    >
      {name}
    </div>
  );
}
