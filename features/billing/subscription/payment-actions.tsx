"use client";

import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatPaymentDate, type SubscriptionPayment } from "./payment-types";

export function PaymentDeadline({ expiresAt, now }: { expiresAt: string; now: number }) {
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  const remaining = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return <p className="text-xs text-zinc-500" title={`Batas pembayaran: ${formatPaymentDate(expiresAt)}`}>
    Selesaikan dalam <span className="font-medium tabular-nums text-zinc-700">{remaining}</span> · batas 15 menit
  </p>;
}

export function CancelPaymentButton({ order, disabled, cancelling, onCancel }: {
  order: SubscriptionPayment;
  disabled: boolean;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const confirmation = useConfirmDialog();
  if (!order.can_cancel) return null;
  return <>
    <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg text-xs text-zinc-500" disabled={disabled} onClick={() => confirmation.confirm({
      title: "Batalkan pembayaran?",
      description: "Batalkan hanya jika Anda belum membayar. Jika saldo sudah terpotong, hubungi admin dengan bukti pembayaran. Pembatalan tidak memengaruhi subscription aktif dan bukan refund. Jika gateway tidak mendukung pembatalan, invoice hanya dibatalkan di POSKART dan mungkin tetap berlaku di gateway hingga kedaluwarsa.",
      confirmLabel: "Ya, batalkan pembayaran",
      cancelLabel: "Kembali",
      destructive: true,
      onConfirm: onCancel,
    })}>
      {cancelling ? "Membatalkan…" : "Batalkan pembayaran"}
    </Button>
    {confirmation.dialog}
  </>;
}

export function PaymentClosedNotice({ order }: { order: SubscriptionPayment }) {
  if (order.status === "cancelled" && !order.gateway_cancelled_at) {
    return <p className="text-xs leading-5 text-zinc-500">Dibatalkan di POSKART. Invoice gateway mungkin masih berlaku sampai kedaluwarsa; jangan gunakan invoice lama. Jika saldo terpotong, hubungi admin dengan bukti pembayaran.</p>;
  }
  return <p className="text-xs leading-5 text-zinc-500">Pembayaran ini sudah ditutup. Jika saldo terpotong, hubungi admin dan kirim bukti pembayaran beserta Order ID.</p>;
}
