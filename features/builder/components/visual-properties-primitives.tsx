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
    <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-950/[0.015]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-[#f8fbff] hover:text-[#174a7e]"
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

export type InspectorTab = "content" | "style" | "layout" | "advanced";
export type CanvasTab = "device" | "background" | "motion";

export function InspectorTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-0.5 rounded-xl border border-zinc-200/80 bg-[#f7f9fc] p-0.5"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86abd5]",
            active === tab.id
              ? "bg-[#dce9f8] text-[#174a7e] shadow-sm shadow-blue-950/[0.06]"
              : "text-zinc-500 hover:bg-white hover:text-[#174a7e]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
