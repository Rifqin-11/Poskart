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
  side?: "left" | "right" | "bottom";
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px]"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "absolute flex flex-col bg-white shadow-2xl shadow-zinc-950/15",
          side === "bottom"
            ? "inset-x-0 top-auto bottom-0 max-h-[86dvh] rounded-t-[2rem] border-t border-zinc-200 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:mx-auto sm:max-w-2xl"
            : side === "left"
              ? "top-3 left-3 h-[calc(100%-1.5rem)] w-[min(calc(100vw-1.5rem),20rem)] rounded-r-[2rem] rounded-l-3xl border border-white/75 bg-white/92 p-4 backdrop-blur-xl sm:w-80"
              : "top-3 right-3 h-[calc(100%-1.5rem)] w-[min(calc(100vw-1.5rem),20rem)] rounded-l-[2rem] rounded-r-3xl border border-white/75 bg-white/92 p-4 backdrop-blur-xl sm:w-80",
        )}
      >
        {side !== "bottom" ? (
          <div className="mb-4 flex shrink-0 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
