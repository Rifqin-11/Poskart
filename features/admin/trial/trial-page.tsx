"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MonitorSmartphone,
  Palette,
  WalletCards,
  Images,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitTrialRequest } from "@/server/admin/actions/trial-actions";
import type { TrialRequest } from "@/types/trial";

type SubscriptionStatus = {
  tier: "Free" | "Pro";
  expiry: string | null;
  isActive: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  planId: string | null;
  planName: string;
  deviceLimit: number;
};

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

export function TrialPage({
  subscription,
  trialRequest,
}: {
  subscription: SubscriptionStatus;
  trialRequest: TrialRequest | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const isTrialing = subscription.status === "trialing";
  const hasActiveRequest =
    trialRequest &&
    !["rejected", "canceled", "activation_expired"].includes(trialRequest.status);
  const canSubmit = !hasActiveRequest && !isTrialing;

  async function handleStart() {
    setSubmitting(true);
    try {
      const result = await submitTrialRequest();
      if (result.autoRejected) {
        toast.error("Tidak dapat memulai trial — duplikasi terdeteksi. Hubungi support.");
      } else {
        toast.success("Request trial dikirim.");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memulai trial.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isTrialing) {
    const days = daysRemaining(subscription.currentPeriodEnd);
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-2xl font-semibold">Trial sedang aktif</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {days !== null ? `${days} hari tersisa` : "Gunakan semua fitur Starter sekarang."}
          {subscription.currentPeriodEnd
            ? ` · berakhir ${new Date(subscription.currentPeriodEnd).toLocaleDateString("id-ID")}`
            : ""}
        </p>
        <Link href="/dashboard">
          <Button className="mt-8">Ke Dashboard <ArrowRight className="size-4" /></Button>
        </Link>
      </div>
    );
  }

  if (trialRequest?.status === "pending" || trialRequest?.status === "needs_information") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl bg-amber-100 text-amber-700">
          <Clock className="size-8" />
        </div>
        <h1 className="text-2xl font-semibold">Sedang ditinjau</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {trialRequest.status === "needs_information"
            ? "Tim kami memerlukan informasi tambahan."
            : "Request Anda dalam antrean review. Biasanya selesai dalam 1 hari kerja."}
        </p>
        {trialRequest.reviewNote && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {trialRequest.reviewNote}
          </p>
        )}
      </div>
    );
  }

  if (trialRequest?.status === "approved") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-2xl font-semibold">Trial disetujui</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Aktifkan dari device kiosk Anda. Berlaku hingga{" "}
          {trialRequest.activationDeadline
            ? new Date(trialRequest.activationDeadline).toLocaleDateString("id-ID")
            : "72 jam"}.
        </p>
      </div>
    );
  }

  if (trialRequest?.status === "rejected" || trialRequest?.status === "activation_expired") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl bg-zinc-100 text-zinc-500">
          <XCircle className="size-8" />
        </div>
        <h1 className="text-2xl font-semibold">
          {trialRequest.status === "activation_expired" ? "Kedaluwarsa" : "Tidak dapat diproses"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {trialRequest.rejectionReason ?? "Hubungi support untuk informasi lebih lanjut."}
        </p>
        <Link href="/contact">
          <Button variant="outline" className="mt-8">Hubungi Support</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl bg-zinc-950 text-white">
          <span className="text-xl font-black">14</span>
        </div>
        <h1 className="text-2xl font-semibold">Mulai trial 14 hari</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Akses penuh fitur Starter. Tidak perlu kartu kredit.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm">
            <Icon className="size-4 shrink-0 text-zinc-400" />
            <span className="text-sm text-zinc-700">{label}</span>
          </div>
        ))}
      </div>

      <Button
        className="mt-8 w-full"
        size="lg"
        disabled={!canSubmit || submitting}
        onClick={handleStart}
      >
        {submitting ? "Memproses..." : "Mulai Trial Gratis"}
        {!submitting && <ArrowRight className="size-4" />}
      </Button>

      <p className="mt-4 text-center text-xs text-zinc-400">
        14 hari · 1 device · data tidak dihapus setelah berakhir
      </p>
    </div>
  );
}
