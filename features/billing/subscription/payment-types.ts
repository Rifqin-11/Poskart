import { businessProfile } from "@/lib/constants/business";

export const SUBSCRIPTION_PAYMENT_MINUTES = 15;

export type SubscriptionPaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export type SubscriptionPayment = {
  merchant_order_id: string;
  plan_name: string;
  amount: number;
  duration_months: number;
  device_count: number;
  status: SubscriptionPaymentStatus;
  payment_gateway: string;
  payment_url: string | null;
  created_at: string;
  gateway_status_checked_at: string | null;
  subscription_activated_at: string | null;
  payment_expires_at: string;
  payment_closed_reason: "expired" | "user_cancelled" | null;
  payment_cancelled_at: string | null;
  gateway_cancelled_at: string | null;
  can_cancel?: boolean;
};

export const subscriptionPaymentLabels: Record<SubscriptionPaymentStatus, string> = {
  pending: "Menunggu konfirmasi",
  paid: "Pembayaran berhasil",
  failed: "Pembayaran gagal",
  cancelled: "Pembayaran dibatalkan",
};

export function isSubscriptionPaymentOpen(order: SubscriptionPayment, now = Date.now()) {
  return order.status === "pending" && new Date(order.payment_expires_at).getTime() > now;
}

export function getSubscriptionPaymentLabel(order: SubscriptionPayment, now = Date.now()) {
  return order.status !== "paid" && (order.payment_closed_reason === "expired" ||
    (order.status === "pending" && !isSubscriptionPaymentOpen(order, now)))
    ? "Pembayaran kedaluwarsa" : subscriptionPaymentLabels[order.status];
}

export function getSubscriptionPaymentUrl(order: SubscriptionPayment, now = Date.now()) {
  if (!isSubscriptionPaymentOpen(order, now) || !order.payment_url) return null;
  try {
    const url = new URL(order.payment_url);
    const domain = order.payment_gateway === "midtrans" ? "midtrans.com" : "duitku.com";
    return url.protocol === "https:" && (url.hostname === domain || url.hostname.endsWith(`.${domain}`))
      ? url.href : null;
  } catch { return null; }
}

export function formatPaymentDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export function getSubscriptionPaymentSupportUrl(order: SubscriptionPayment) {
  const message = `Halo admin POSKART, mohon bantu periksa pembayaran subscription saya.\nOrder ID: ${order.merchant_order_id}\nPaket: ${order.plan_name}\nNominal: Rp${Number(order.amount).toLocaleString("id-ID")}\nTanggal: ${formatPaymentDate(order.created_at)}\nStatus: ${getSubscriptionPaymentLabel(order)}\nJika saldo sudah terpotong, saya akan melampirkan bukti pembayaran.`;
  return `${businessProfile.whatsappUrl}?text=${encodeURIComponent(message)}`;
}
