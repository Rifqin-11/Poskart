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
          "absolute top-0 h-full w-80 border-zinc-200 bg-white p-4 shadow-xl",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
        )}
      >
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
