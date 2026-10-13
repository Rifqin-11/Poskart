"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { formatPaymentDate, getSubscriptionPaymentLabel, getSubscriptionPaymentSupportUrl, getSubscriptionPaymentUrl, isSubscriptionPaymentOpen } from "@/features/billing/subscription/payment-types";
import { CancelPaymentButton, PaymentClosedNotice, PaymentDeadline } from "@/features/billing/subscription/payment-actions";
import { useSubscriptionPayments } from "@/features/billing/subscription/use-subscription-payments";

export function CheckoutPaymentStatus({ orderId }: { orderId: string }) {
  const payments = useSubscriptionPayments(orderId);
  const order = payments.orders[0];
  const paid = order?.status === "paid";
  const open = Boolean(order && isSubscriptionPaymentOpen(order, payments.now));
  const failed = Boolean(order && !paid && !open);
  const needsLogin = payments.error?.status === 401;
  const resumeUrl = order ? getSubscriptionPaymentUrl(order, payments.now) : null;
  const busy = payments.check.isPending || payments.cancel.isPending || payments.isFetching;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5 grid size-12 place-items-center rounded-lg bg-zinc-100">
        {paid ? <CheckCircle2 className="size-6 text-emerald-600" /> : failed ? <XCircle className="size-6 text-red-600" /> : <Clock3 className="size-6 text-zinc-700" />}
      </div>
      <div aria-live="polite">
        <h1 className="text-2xl font-semibold tracking-tight">
          {needsLogin ? "Masuk untuk melihat pembayaran" : payments.error ? "Status belum dapat dimuat" : payments.isLoading ? "Memeriksa pembayaran…" : !order ? "Pembayaran tidak ditemukan" : getSubscriptionPaymentLabel(order, payments.now)}
        </h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          {paid ? order.subscription_activated_at ? "Pembayaran berhasil diterima dan masa aktif subscription POSKART telah diperpanjang." : "Pembayaran berhasil diterima. Lihat masa aktif subscription di Settings → Organization."
            : failed ? "Pembayaran ini sudah gagal, kedaluwarsa, atau dibatalkan. Jika saldo sudah terpotong, hubungi admin dengan bukti pembayaran dan Order ID; jangan bayar ulang. Konfirmasi lunas yang terlambat tetap akan diproses."
            : needsLogin ? "Gunakan akun yang terhubung dengan organization pemilik pembayaran ini."
            : payments.error ? payments.error.message
            : payments.isLoading ? "Mengambil status order dan mengecek konfirmasi gateway."
            : !order ? "Order ini tidak ditemukan di organization Anda. Pastikan Anda menggunakan akun yang benar."
            : "Jika sudah membayar, jangan bayar ulang. Kami mengecek konfirmasi gateway setiap 15 detik selama halaman ini terbuka. Langganan yang masih aktif tidak berubah selama pembayaran pending."}
        </p>
      </div>
      <div className="mt-5 space-y-1 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
        <p className="break-all">Order ID: <span className="font-medium text-zinc-950">{orderId}</span></p>
        {order ? <p>{order.plan_name} · {formatCurrency(order.amount)} · {order.duration_months} bulan · {order.device_count} device</p> : null}
        {order?.gateway_status_checked_at ? <p className="pt-1 text-xs">Terakhir dikonfirmasi: {formatPaymentDate(order.gateway_status_checked_at)}</p> : null}
        {order && open ? <PaymentDeadline expiresAt={order.payment_expires_at} now={payments.now} /> : null}
      </div>
      {order && failed ? <div className="mt-3"><PaymentClosedNotice order={order} /></div> : null}
      {open && payments.checkErrors[orderId] ? <p className="mt-3 text-sm leading-6 text-amber-700" role="status">{payments.checkErrors[orderId]}</p> : null}
      {open && payments.check.error ? <p className="mt-3 text-sm leading-6 text-amber-700" role="alert">{payments.check.error.message}</p> : null}
      {payments.cancel.error ? <p className="mt-3 text-sm leading-6 text-amber-700" role="alert">{payments.cancel.error.message}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {needsLogin ? (
          <Link href={`/login?next=${encodeURIComponent(`/checkout/return?order=${orderId}`)}`} className={buttonVariants()}>Masuk</Link>
        ) : payments.error ? (
          <Button type="button" disabled={payments.isFetching} onClick={() => void payments.refetch()}>Coba lagi</Button>
        ) : open ? (
          <Button type="button" disabled={busy} onClick={() => payments.check.mutate(orderId)}>
            <RefreshCw className={`size-4 ${payments.check.isPending ? "animate-spin motion-reduce:animate-none" : ""}`} />
            {payments.check.isPending || payments.isFetching ? "Mengecek…" : "Cek status pembayaran"}
          </Button>
        ) : null}
        {resumeUrl ? <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>Lanjutkan pembayaran</a> : null}
        {order && open ? <CancelPaymentButton order={order} disabled={busy} cancelling={payments.cancel.isPending} onCancel={() => payments.cancel.mutate(orderId)} /> : null}
        {order && failed ? <a href={getSubscriptionPaymentSupportUrl(order)} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>Hubungi admin</a> : null}
        <Link href="/settings?tab=billing" className={buttonVariants({ variant: "outline" })}>Buka Langganan</Link>
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>Buka dashboard</Link>
      </div>
      {open && payments.checkErrors[orderId] && order ? <p className="mt-4 text-xs text-zinc-500">Butuh bantuan? <a href={getSubscriptionPaymentSupportUrl(order)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Hubungi admin</a> dan lampirkan bukti pembayaran.</p> : null}
    </div>
  );
}
