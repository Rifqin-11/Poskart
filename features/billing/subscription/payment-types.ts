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
};

export const subscriptionPaymentLabels: Record<SubscriptionPaymentStatus, string> = {
  pending: "Menunggu konfirmasi",
  paid: "Pembayaran berhasil",
  failed: "Pembayaran gagal / kedaluwarsa",
  cancelled: "Pembayaran dibatalkan",
};

export function getSubscriptionPaymentUrl(order: SubscriptionPayment) {
  if (order.status !== "pending" || !order.payment_url) return null;
  try {
    const url = new URL(order.payment_url);
    const domain = order.payment_gateway === "midtrans" ? "midtrans.com" : "duitku.com";
    return url.protocol === "https:" && (url.hostname === domain || url.hostname.endsWith(`.${domain}`))
      ? url.href : null;
  } catch { return null; }
}

export function formatPaymentDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}
