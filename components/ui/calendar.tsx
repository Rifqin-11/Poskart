"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export { type DateRange };

export function Calendar({ className, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      mode="range"
      numberOfMonths={2}
      navLayout="around"
      showOutsideDays
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-4 [--rdp-accent-color:#e4e4e7] [--rdp-accent-background-color:#f4f4f5] [--rdp-range_middle-background-color:#f4f4f5] [--rdp-range_middle-color:#18181b] [--rdp-range_start-color:#18181b] [--rdp-range_start-date-background-color:#e4e4e7] [--rdp-range_end-color:#18181b] [--rdp-range_end-date-background-color:#e4e4e7]",
        className,
      )}
      classNames={{
        months: "flex gap-6",
        month: "relative space-y-3",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-sm font-semibold text-zinc-950",
        button_previous: "absolute left-0 top-0 inline-flex size-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100",
        button_next: "absolute right-0 top-0 inline-flex size-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100",
        month_grid: "w-full border-collapse",
        weekday: "size-9 text-center text-xs font-medium text-zinc-500",
        week: "",
        day: "size-9 p-0 text-center text-sm text-zinc-900",
        day_button: "inline-flex size-9 items-center justify-center rounded-md text-zinc-900 hover:bg-zinc-100",
        selected: "bg-zinc-200 text-zinc-950 [&>button]:text-zinc-950",
        range_start: "rounded-l-md text-zinc-950 [&>button]:text-zinc-950",
        range_end: "rounded-r-md text-zinc-950 [&>button]:text-zinc-950",
        range_middle: "bg-zinc-100 text-zinc-950 [&>button]:text-zinc-950",
        today: "font-semibold text-zinc-950",
        outside: "text-zinc-300",
        disabled: "text-zinc-300",
      }}
      {...props}
    />
  );
}
