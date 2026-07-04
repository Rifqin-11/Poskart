"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "left",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right";
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px]">
      <div
        className={cn(
          "absolute top-3 flex h-[calc(100%-1.5rem)] w-[min(calc(100vw-1.5rem),20rem)] flex-col border border-white/75 bg-white/92 p-4 shadow-2xl shadow-zinc-950/15 backdrop-blur-xl sm:w-80",
          side === "left"
            ? "left-3 rounded-r-[2rem] rounded-l-3xl"
            : "right-3 rounded-l-[2rem] rounded-r-3xl",
        )}
      >
        <div className="mb-4 flex shrink-0 justify-end">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
