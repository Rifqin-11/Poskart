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
        "grid min-w-0 gap-6 border-b border-zinc-100 py-7 last:border-b-0 last:pb-0 lg:grid-cols-[200px_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon && (
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-[13px] font-semibold text-zinc-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
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
        "rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsSummaryItem({
  label,
  value,
  icon,
  helper,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  helper?: string;
}) {
  return (
    <div className="min-w-0 border-b border-zinc-100 py-3 first:pt-0 last:border-b-0 last:pb-0 sm:border-b-0 sm:border-r sm:px-4 sm:py-0 sm:first:pl-0 sm:[&:nth-child(2)]:border-r-0 sm:last:border-r-0 sm:last:pr-0 xl:[&:nth-child(2)]:border-r">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold text-zinc-950">
        {value}
      </div>
      {helper ? (
        <p className="mt-1 text-xs leading-5 text-zinc-400">{helper}</p>
      ) : null}
    </div>
  );
}

export function SettingsFormIntro({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#00357B] text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
        <p className="mt-0.5 max-w-2xl text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>
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
      <div className="flex items-start gap-2.5">
        {icon && (
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-[13px] font-semibold text-zinc-900">{title}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-400">
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
        "block min-w-0 text-[11px] font-medium uppercase tracking-wide text-zinc-400 [&_input:not([readonly]):not([disabled])]:border-zinc-300 [&_input:not([readonly]):not([disabled])]:bg-white [&_input:not([readonly]):not([disabled])]:text-zinc-950 [&_input:not([readonly]):not([disabled])]:shadow-sm [&_input:not([readonly]):not([disabled])]:focus:border-[#00357B] [&_input:not([readonly]):not([disabled])]:focus:ring-[#00357B]/15 [&_select:not([disabled])]:border-zinc-300 [&_select:not([disabled])]:bg-white [&_select:not([disabled])]:text-zinc-950 [&_select:not([disabled])]:shadow-sm [&_select:not([disabled])]:focus:border-[#00357B] [&_select:not([disabled])]:focus:ring-[#00357B]/15",
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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-zinc-900">{title}</div>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-zinc-400">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
