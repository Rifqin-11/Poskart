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
        "rounded-xl border border-zinc-200 bg-white p-4 [--rdp-accent-color:#00357B] [--rdp-accent-background-color:#00357B] [--rdp-range_middle-background-color:#e6f0ff] [--rdp-range_middle-color:#00357B] [--rdp-range_start-color:#fff] [--rdp-range_start-date-background-color:#00357B] [--rdp-range_end-color:#fff] [--rdp-range_end-date-background-color:#00357B]",
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
        selected:
          "bg-[#00357B] text-white [&>button]:bg-[#00357B] [&>button]:font-semibold [&>button]:text-white hover:[&>button]:bg-[#00275b]",
        range_start:
          "rounded-l-md bg-[#00357B] text-white [&>button]:bg-[#00357B] [&>button]:text-white",
        range_end:
          "rounded-r-md bg-[#00357B] text-white [&>button]:bg-[#00357B] [&>button]:text-white",
        range_middle:
          "bg-blue-50 text-[#00357B] [&>button]:rounded-none [&>button]:bg-blue-50 [&>button]:font-medium [&>button]:text-[#00357B]",
        today:
          "font-bold text-[#00357B] [&>button]:border-2 [&>button]:border-[#00357B] [&>button]:text-[#00357B]",
        outside: "text-zinc-300",
        disabled: "text-zinc-300",
      }}
      {...props}
    />
  );
}
