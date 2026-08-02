"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Images,
  MonitorSmartphone,
  Palette,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { submitTrialRequest } from "@/server/admin/actions/trial-actions";
import type { TrialRequest } from "@/types/trial";

const FEATURES = [
  { icon: MonitorSmartphone, label: "1 kiosk device" },
  { icon: Palette, label: "Theme & layout builder" },
  { icon: WalletCards, label: "QRIS payment" },
  { icon: Images, label: "Gallery & live photo" },
];

function daysRemaining(endsAt: string | null) {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function TrialContent({
  trialRequest,
  onClose,
}: {
  trialRequest: TrialRequest | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const status = trialRequest?.status;

  async function handleStart() {
    setSubmitting(true);
    try {
      const result = await submitTrialRequest();
      if (result.autoRejected) {
        toast.error("Tidak dapat memulai trial — duplikasi terdeteksi. Hubungi support.");
      } else {
        toast.success("Request trial dikirim.");
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.myTrialRequest });
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memulai trial.");
    } finally {
      setSubmitting(false);
    }
  }

  if (trialRequest && (status === "pending" || status === "needs_information")) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock className="size-6" />
        </div>
        <div>
          <p className="font-semibold">Sedang ditinjau</p>
          <p className="mt-1 text-sm text-zinc-500">
            {status === "needs_information"
              ? "Tim kami memerlukan informasi tambahan."
              : "Biasanya selesai dalam 1 hari kerja."}
          </p>
          {trialRequest.reviewNote && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {trialRequest.reviewNote}
            </p>
          )}
        </div>
        <Button variant="outline" className="mt-2 w-full" onClick={onClose}>Tutup</Button>
      </div>
    );
  }

  if (trialRequest && status === "approved") {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-500">
          <Clock className="size-6" />
        </div>
        <div>
          <p className="font-semibold">Sedang diaktifkan</p>
          <p className="mt-1 text-sm text-zinc-500">
            Trial Anda sedang diproses. Halaman akan diperbarui otomatis.
          </p>
        </div>
        <Button variant="outline" className="mt-2 w-full" onClick={onClose}>Tutup</Button>
      </div>
    );
  }

  if (trialRequest && (status === "rejected" || status === "activation_expired")) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-500">
          <XCircle className="size-6" />
        </div>
        <div>
          <p className="font-semibold">
            {status === "activation_expired" ? "Kedaluwarsa" : "Tidak dapat diproses"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {trialRequest.rejectionReason ?? "Hubungi support untuk informasi lebih lanjut."}
          </p>
        </div>
        <Button variant="outline" className="mt-2 w-full" onClick={onClose}>Tutup</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-1">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-zinc-950 text-white">
          <span className="text-lg font-black">14</span>
        </div>
        <p className="font-semibold">Mulai trial 14 hari</p>
        <p className="text-sm text-zinc-500">Akses penuh fitur Starter. Tidak perlu kartu kredit.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
            <Icon className="size-3.5 shrink-0 text-zinc-400" />
            <span className="text-xs text-zinc-600">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button className="w-full" disabled={submitting} onClick={handleStart}>
          {submitting ? "Memproses..." : "Mulai Trial Gratis"}
          {!submitting && <ArrowRight className="size-4" />}
        </Button>
        <p className="text-center text-[11px] text-zinc-400">
          14 hari · 1 device · data tidak dihapus setelah berakhir
        </p>
      </div>
    </div>
  );
}

export function TrialDialog({
  open,
  onOpenChange,
  trialRequest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialRequest: TrialRequest | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Trial POSKART">
      <TrialContent trialRequest={trialRequest} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}
