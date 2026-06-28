"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-zinc-500">
      {label}
      <div className="mt-1 grid grid-cols-[42px_1fr] gap-2">
        <Input
          className="h-9 p-1"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

export function PanelSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold transition-colors hover:bg-zinc-50"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span
          className={cn(
            "text-zinc-400 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-zinc-100 p-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
