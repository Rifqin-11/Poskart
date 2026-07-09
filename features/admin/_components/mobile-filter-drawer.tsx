"use client";

import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileFilterButton({
  active,
  onClick,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="icon"
      className={cn("shrink-0", className)}
      onClick={onClick}
      aria-label="Open filters"
    >
      <Filter className="size-4" />
    </Button>
  );
}

export function MobileFilterDrawer({
  open,
  onOpenChange,
  title = "Filters",
  description,
  children,
  onReset,
  resetDisabled,
  doneLabel = "Done",
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  onReset?: () => void;
  resetDisabled?: boolean;
  doneLabel?: string;
  onDone?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <div className="flex min-h-0 flex-col">
        <div className="mb-4">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-zinc-200" />
          <div className="mt-5">
            <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {children}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!onReset || resetDisabled}
            onClick={onReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={() => {
              onDone?.();
              onOpenChange(false);
            }}
          >
            {doneLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function MobileFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
