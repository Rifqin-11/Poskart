"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Popover({
  trigger,
  children,
  className,
  align = "left",
  width,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  width?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ bottom: 0, left: 16 });
  const resolvedWidth = width ?? 672;

  React.useEffect(() => {
    if (!open) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [open]);

  function togglePopover() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        bottom: window.innerHeight - rect.top + 8,
        left:
            align === "right"
            ? Math.max(16, rect.right - resolvedWidth)
            : Math.max(
                16,
                Math.min(rect.left, window.innerWidth - resolvedWidth - 16),
              ),
      });
    }
    setOpen((value) => !value);
  }

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        className="w-full text-left"
        onClick={togglePopover}
      >
        {trigger}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className={cn(
                "fixed z-[60] rounded-lg border border-zinc-200 bg-white p-3 shadow-xl",
                width
                  ? "w-auto"
                  : "w-[min(42rem,calc(100vw-2rem))]",
                className,
              )}
              style={{
                ...position,
                ...(width
                  ? {
                      width: `min(${width}px, calc(100vw - 2rem))`,
                      maxWidth: "calc(100vw - 2rem)",
                    }
                  : null),
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
