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
    <div className="fixed inset-0 z-50 bg-black/30">
      <div
        className={cn(
          "absolute top-3 h-[calc(100%-1.5rem)] w-80 border border-white/75 bg-white/92 p-4 shadow-2xl shadow-zinc-950/15 backdrop-blur-xl",
          side === "left"
            ? "left-3 rounded-r-[2rem] rounded-l-3xl"
            : "right-3 rounded-l-[2rem] rounded-r-3xl",
        )}
      >
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
