"use client";

import * as React from "react";

export function Popover({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {trigger}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-40 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl">
          {children}
        </div>
      ) : null}
    </div>
  );
}
