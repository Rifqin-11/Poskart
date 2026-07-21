"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export { type DateRange };

export function Calendar({ className, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      mode="range"
      showOutsideDays
      className={cn("rounded-md bg-white p-2", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        caption: "flex items-center justify-between px-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: "rounded-md p-1 hover:bg-zinc-100",
        button_next: "rounded-md p-1 hover:bg-zinc-100",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-center text-[0.8rem] font-normal text-zinc-500",
        week: "mt-1 flex w-full",
        day: "relative size-9 p-0 text-center text-sm",
        day_button: "size-9 rounded-md hover:bg-zinc-100",
        selected: "bg-zinc-950 text-white hover:bg-zinc-800",
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        range_middle: "bg-zinc-100 text-zinc-950",
        today: "font-semibold",
        outside: "text-zinc-300",
        disabled: "text-zinc-300",
      }}
      {...props}
    />
  );
}
