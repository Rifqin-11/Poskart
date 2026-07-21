"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export function Popover({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ bottom: 0, left: 16 });

  function togglePopover() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 688)),
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
              className="fixed z-[60] w-[min(42rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 shadow-xl"
              style={position}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
