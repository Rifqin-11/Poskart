import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDateTime(value: string | Date | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";
  return date
    .toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":");
}
