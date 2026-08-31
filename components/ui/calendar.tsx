"use client";

import { DayPicker, type DateRange, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export { type DateRange };

type SingleCalendarProps = Extract<DayPickerProps, { mode: "single" }>;
type RangeCalendarProps =
  | Extract<DayPickerProps, { mode: "range" }>
  | Extract<DayPickerProps, { mode?: undefined }>;
type CalendarProps = SingleCalendarProps | RangeCalendarProps;

export function Calendar({ className, ...props }: CalendarProps) {
  if (props.mode === "single") {
    return (
      <DayPicker
        {...props}
        mode="single"
        numberOfMonths={props.numberOfMonths ?? 1}
        navLayout="around"
        showOutsideDays
        className={cn(calendarClassName, "w-full", className)}
        classNames={singleCalendarClassNames}
      />
    );
  }

  return (
    <DayPicker
      {...props}
      mode="range"
      numberOfMonths={props.numberOfMonths ?? 2}
      navLayout="around"
      showOutsideDays
      className={cn(calendarClassName, className)}
      classNames={calendarClassNames}
    />
  );
}

const calendarClassName =
  "rounded-xl border border-zinc-200 bg-white p-4 [--rdp-accent-color:#00357B] [--rdp-accent-background-color:#00357B] [--rdp-range_middle-background-color:#e6f0ff] [--rdp-range_middle-color:#00357B] [--rdp-range_start-color:#fff] [--rdp-range_start-date-background-color:#00357B] [--rdp-range_end-color:#fff] [--rdp-range_end-date-background-color:#00357B]";

const calendarClassNames = {
  months: "flex gap-6",
  month: "relative space-y-3",
  month_caption: "flex h-9 items-center justify-center",
  caption_label: "text-sm font-semibold text-zinc-950",
  button_previous: "absolute left-0 top-0 inline-flex size-9 items-center justify-center rounded-md text-[#00357B] hover:bg-blue-50",
  button_next: "absolute right-0 top-0 inline-flex size-9 items-center justify-center rounded-md text-[#00357B] hover:bg-blue-50",
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
    "bg-blue-50 text-zinc-950 [&>button]:rounded-none [&>button]:bg-blue-50 [&>button]:font-medium [&>button]:text-zinc-950",
  today:
    "rounded-md bg-zinc-100 font-bold text-[#00357B] data-[selected=true]:bg-[#00357B] data-[selected=true]:text-white [&>button]:border-0 [&>button]:bg-zinc-100 [&>button]:text-[#00357B] [&[data-selected=true]>button]:bg-[#00357B] [&[data-selected=true]>button]:text-white",
  outside: "text-zinc-300",
  disabled: "text-zinc-300",
};

const singleCalendarClassNames = {
  ...calendarClassNames,
  months: "flex w-full min-w-0",
  month: "relative w-full min-w-0 space-y-3",
  month_grid: "w-full table-fixed border-collapse",
  weekday: "h-9 w-[14.285%] text-center text-xs font-medium text-zinc-500",
  day: "h-9 w-[14.285%] p-0 text-center text-sm text-zinc-900",
  day_button:
    "inline-flex h-9 w-full items-center justify-center rounded-md text-zinc-900 hover:bg-zinc-100",
};
