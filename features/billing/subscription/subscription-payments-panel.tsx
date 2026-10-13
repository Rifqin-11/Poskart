"use client";

import Link from "next/link";
import { Clock3, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { formatPaymentDate, getSubscriptionPaymentLabel, getSubscriptionPaymentSupportUrl, getSubscriptionPaymentUrl, isSubscriptionPaymentOpen, type SubscriptionPayment } from "./payment-types";
import { CancelPaymentButton, PaymentClosedNotice, PaymentDeadline } from "./payment-actions";
import { useSubscriptionPayments } from "./use-subscription-payments";

function PaymentRow({ order, payments }: { order: SubscriptionPayment; payments: ReturnType<typeof useSubscriptionPayments> }) {
  const open = isSubscriptionPaymentOpen(order, payments.now);
  const resumeUrl = getSubscriptionPaymentUrl(order, payments.now);
  const checking = payments.check.isPending && payments.check.variables === order.merchant_order_id;
  const cancelling = payments.cancel.isPending && payments.cancel.variables === order.merchant_order_id;
  const busy = payments.check.isPending || payments.cancel.isPending || payments.isFetching;
  return (
    <li className="space-y-2 py-3 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-950">{order.plan_name} · {formatCurrency(order.amount)}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{formatPaymentDate(order.created_at)} · {order.payment_gateway === "midtrans" ? "Midtrans" : "Duitku"}</p>
        </div>
        <span className={`text-xs font-medium ${order.status === "paid" ? "text-emerald-700" : "text-zinc-600"}`}>{getSubscriptionPaymentLabel(order, payments.now)}</span>
      </div>
      <p className="break-all text-[11px] text-zinc-400">Order: {order.merchant_order_id}</p>
      {open ? <PaymentDeadline expiresAt={order.payment_expires_at} now={payments.now} /> : null}
      {order.gateway_status_checked_at ? <p className="text-[11px] text-zinc-500">Terakhir dikonfirmasi: {formatPaymentDate(order.gateway_status_checked_at)}</p> : null}
      {open && payments.checkErrors[order.merchant_order_id] ? <p className="text-xs leading-5 text-amber-700" role="status">{payments.checkErrors[order.merchant_order_id]}</p> : null}
      {!open && order.status !== "paid" ? <PaymentClosedNotice order={order} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {open ? <>
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={busy} onClick={() => payments.check.mutate(order.merchant_order_id)}>
            <RefreshCw className={`size-3.5 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`} />
            {checking ? "Mengecek…" : "Cek status"}
          </Button>
          {resumeUrl ? <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "ghost", className: "h-8 rounded-lg text-xs" })}>Lanjutkan pembayaran</a> : null}
          <CancelPaymentButton order={order} disabled={busy} cancelling={cancelling} onCancel={() => payments.cancel.mutate(order.merchant_order_id)} />
        </> : order.status !== "paid" ? (
          <a href={getSubscriptionPaymentSupportUrl(order)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline", className: "h-8 rounded-lg text-xs" })}>Hubungi admin</a>
        ) : null}
        <Link href={`/checkout/return?order=${encodeURIComponent(order.merchant_order_id)}`} className={buttonVariants({ size: "sm", variant: "ghost", className: "h-8 rounded-lg text-xs" })}>Lihat pembayaran</Link>
      </div>
    </li>
  );
}

export function SubscriptionPaymentsPanel() {
  const payments = useSubscriptionPayments();
  const pendingOrders = payments.orders.filter((order) => isSubscriptionPaymentOpen(order, payments.now));
  const historyOrders = payments.orders.filter((order) => !isSubscriptionPaymentOpen(order, payments.now));

  return (
    <div id="subscription-payments" className="space-y-3 border-t border-zinc-100 pt-4">
      <h3 className="text-sm font-semibold text-zinc-950">Pembayaran langganan</h3>
      {payments.isLoading ? <p className="text-xs text-zinc-500">Memuat pembayaran…</p> : null}
      {payments.error ? <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <p>{payments.error.message}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void payments.refetch()}>Coba lagi</Button>
      </div> : null}
      {pendingOrders.length > 0 ? <>
        <div className="flex items-start gap-2 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
          <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Pembayaran berlaku 15 menit. Jika sudah membayar, jangan bayar ulang. Status diperbarui otomatis; subscription yang masih aktif tidak berubah selama pembayaran pending.</p>
        </div>
        <ul className="divide-y divide-zinc-100">{pendingOrders.map((order) => <PaymentRow key={order.merchant_order_id} order={order} payments={payments} />)}</ul>
      </> : null}
      {payments.cancel.error ? <p className="text-xs leading-5 text-amber-700" role="alert">{payments.cancel.error.message}</p> : null}
      {!payments.isLoading && !payments.error && payments.orders.length === 0 ? <p className="text-xs text-zinc-500">Belum ada pembayaran langganan.</p> : null}
      {historyOrders.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-4">Riwayat pembayaran ({historyOrders.length} terakhir)</summary>
          <ul className="mt-3 divide-y divide-zinc-100">{historyOrders.map((order) => <PaymentRow key={order.merchant_order_id} order={order} payments={payments} />)}</ul>
        </details>
      ) : null}
    </div>
  );
}

export function SubscriptionPaymentDashboardNotice() {
  const { orders, now } = useSubscriptionPayments(undefined, false);
  if (!orders.some((order) => isSubscriptionPaymentOpen(order, now))) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-zinc-500" role="status">
      <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />Pembayaran langganan menunggu konfirmasi.</span>
      <Link href="/settings?tab=billing" className="font-medium text-zinc-950 underline underline-offset-4">Cek di Langganan</Link>
    </div>
  );
}
