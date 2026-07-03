"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
  overlayClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/30 p-2 backdrop-blur-sm sm:p-4",
        overlayClassName,
      )}
    >
      <div
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
