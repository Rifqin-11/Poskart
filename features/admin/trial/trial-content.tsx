"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Images, MonitorSmartphone, Palette, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { showErrorToast, toast } from "@/lib/toast";
import { trialEligibilityTitle, trialUnavailableMessage } from "@/lib/trial-policy";
import { submitTrialRequest } from "@/server/admin/actions/trial-actions";
import type { TrialEligibility } from "@/types/trial";

const FEATURES = [
  { icon: MonitorSmartphone, label: "1 kiosk device" },
  { icon: Palette, label: "Theme & layout builder" },
  { icon: WalletCards, label: "QRIS payment" },
  { icon: Images, label: "Gallery & live photo" },
];

export function TrialContent({
  eligibility,
  onStarted,
}: {
  eligibility: TrialEligibility | null;
  onStarted?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  async function refreshTrial() {
    await Promise.all([
      adminQueryKeys.myTrialEligibility,
      adminQueryKeys.myTrialRequest,
      adminQueryKeys.subscriptionStatus,
      adminQueryKeys.dashboard,
    ].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    router.refresh();
  }

  async function handleStart() {
    setSubmitting(true);
    try {
      const result = await submitTrialRequest();
      if (result.autoRejected) {
        toast.error(trialUnavailableMessage(result.rejectionCode));
        await refreshTrial();
      } else {
        toast.success(result.alreadyActive ? "Trial Anda sudah aktif." : "Trial 14 hari Anda langsung aktif!");
        await refreshTrial();
        onStarted?.();
      }
    } catch (error) {
      showErrorToast("Tidak dapat memulai trial", error, "Gagal memulai trial.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!eligibility) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-sm text-zinc-500">Jatah trial belum dapat diverifikasi.</p>
        <Button variant="outline" onClick={() => void refreshTrial()}>Periksa ulang</Button>
      </div>
    );
  }

  const end = eligibility.endsAt ? new Date(eligibility.endsAt) : null;
  const checkedAt = new Date(eligibility.checkedAt).getTime();
  const trialActive = eligibility.claimStatus === "active" && end && end.getTime() > checkedAt;
  if (trialActive) {
    const days = Math.max(0, Math.ceil((end.getTime() - checkedAt) / 86_400_000));
    return (
      <div className="space-y-4 py-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h1 className="text-xl font-semibold">Trial sedang aktif</h1>
        <p className="text-sm text-zinc-500">
          {days} hari tersisa · berakhir {end.toLocaleDateString("id-ID")}
        </p>
        <Link href="/dashboard"><Button>Ke Dashboard <ArrowRight className="size-4" /></Button></Link>
      </div>
    );
  }

  if (!eligibility.eligible) {
    return (
      <div className="space-y-4 py-4 text-center">
        <XCircle className="mx-auto size-10 text-zinc-400" />
        <h1 className="text-xl font-semibold">{trialEligibilityTitle(eligibility)}</h1>
        <p className="text-sm text-zinc-500">
          {eligibility.claimStatus === "revoked"
            ? "Trial organisasi ini telah dicabut oleh superadmin. Jatah trial tidak dapat digunakan kembali."
            : trialUnavailableMessage(eligibility.reason)}
        </p>
        {eligibility.revokeReason && (
          <p className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">Alasan: {eligibility.revokeReason}</p>
        )}
        <p className="text-xs text-zinc-400">Data organisasi tetap tersimpan.</p>
        <Link href="/subscriptions"><Button>Pilih Paket Berlangganan <ArrowRight className="size-4" /></Button></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-1">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-zinc-950 text-white">
          <span className="text-lg font-black">14</span>
        </div>
        <h1 className="font-semibold">Mulai trial 14 hari</h1>
        <p className="text-sm text-zinc-500">Langsung aktif tanpa menunggu persetujuan. Tidak perlu kartu kredit.</p>
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
          {submitting ? "Mengaktifkan..." : "Mulai Trial Gratis"}
          {!submitting && <ArrowRight className="size-4" />}
        </Button>
        <p className="text-center text-xs text-zinc-400">Hanya 1 kali per organisasi dan email. Masa trial dimulai sekarang.</p>
        <p className="text-center text-[11px] text-zinc-400">14 hari · 1 device · data tidak dihapus setelah berakhir</p>
      </div>
    </div>
  );
}
