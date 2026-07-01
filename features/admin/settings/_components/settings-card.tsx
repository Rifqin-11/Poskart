"use client";

import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SettingsCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SettingsCard({
  title,
  description,
  icon,
  children,
  className,
}: SettingsCardProps) {
  return (
    <section
      className={cn(
        "grid gap-5 border-b border-zinc-100 pb-8 last:border-b-0 last:pb-0 lg:grid-cols-[240px_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {description}
          </p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function SettingsPanelBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsInlineHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function SettingField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "block min-w-0 text-xs font-medium text-zinc-600",
        className,
      )}
    >
      <span>{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function SwitchSetting({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 rounded-3xl border border-zinc-200 bg-white p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-900">{title}</div>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
