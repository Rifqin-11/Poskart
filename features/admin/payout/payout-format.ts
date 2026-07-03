import type { PayoutStatus } from "@/types/payout";

export function formatPayoutCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPayoutDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPayoutStatusLabel(status: PayoutStatus) {
  const labels: Record<PayoutStatus, string> = {
    requested: "Requested",
    approved: "Approved",
    paid: "Paid",
    rejected: "Rejected",
    canceled: "Canceled",
  };
  return labels[status];
}

export function getPayoutStatusClassName(status: PayoutStatus) {
  const classes: Record<PayoutStatus, string> = {
    requested: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    canceled: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return classes[status];
}
