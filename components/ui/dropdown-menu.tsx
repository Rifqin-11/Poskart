"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DropdownMenuItem = {
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  rightLabel?: string;
};

type DropdownMenuPosition = {
  top: number;
  left: number;
  maxHeight: number;
};

export function DropdownMenu({
  items,
  align = "right",
  trigger,
  width = 176,
}: {
  items: DropdownMenuItem[];
  align?: "left" | "right";
  trigger?: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  width?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<DropdownMenuPosition | null>(
    null,
  );
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = React.useCallback(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement) return;

    const rect = triggerElement.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? items.length * 38 + 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;
    const gap = 6;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp =
      spaceBelow < menuHeight + margin && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, rect.top - menuHeight - gap)
      : Math.min(rect.bottom + gap, viewportHeight - menuHeight - margin);
    const preferredLeft =
      align === "right" ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(margin, preferredLeft),
      viewportWidth - width - margin,
    );

    setPosition({
      top,
      left,
      maxHeight: Math.max(120, viewportHeight - margin * 2),
    });
  }, [align, items.length, width]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div ref={triggerRef} className="inline-flex">
        {trigger ? (
          trigger({ open, toggle: () => setOpen((value) => !value) })
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <MoreHorizontal />
          </Button>
        )}
      </div>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-xl"
              style={{
                top: position.top,
                left: position.left,
                width,
                maxHeight: position.maxHeight,
              }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40",
                    item.destructive && "text-red-600",
                  )}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  {item.rightLabel ? (
                    <span className="text-xs text-zinc-400">
                      {item.rightLabel}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>,
          document.body,
        )
        : null}
    </>
  );
}
