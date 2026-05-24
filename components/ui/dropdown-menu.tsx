"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DropdownMenu({
  items,
  align = "right",
}: {
  items: { label: string; onClick?: () => void; destructive?: boolean }[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal />
      </Button>
      {open ? (
        <div
          className={cn(
            "absolute top-10 z-40 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100",
                item.destructive && "text-red-600",
              )}
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
