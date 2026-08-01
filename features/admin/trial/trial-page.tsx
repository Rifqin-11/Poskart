"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitTrialRequest } from "@/server/admin/actions/trial-actions";
import type { TrialRequest, TrialRequestStatus } from "@/types/trial";

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

function daysRemaining(endsAt: string | null) {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function StatusCard({ request }: { request: TrialRequest }) {
  const status = request.status;

  if (status === "pending" || status === "needs_information") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <Clock className="size-5" />
            </div>
            <div>
              <CardTitle>Request sedang ditinjau</CardTitle>
              <CardDescription>
                {status === "needs_information"
                  ? "Super Admin membutuhkan informasi tambahan dari Anda."
                  : "Request Anda sedang dalam antrean review Super Admin."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {status === "needs_information" && request.reviewNote && (
          <CardContent>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Catatan dari reviewer:</strong> {request.reviewNote}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  if (status === "approved") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <CardTitle>Trial disetujui!</CardTitle>
              <CardDescription>
                Aktifkan trial Anda melalui device yang telah dipasangkan. Persetujuan
                berlaku hingga{" "}
                {request.activationDeadline
                  ? new Date(request.activationDeadline).toLocaleString("id-ID")
                  : "—"}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (status === "activated") {
    const days = daysRemaining(request.activationDeadline);
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <CardTitle>Trial sedang aktif</CardTitle>
              <CardDescription>
                {days !== null ? `${days} hari tersisa.` : "Trial Anda sedang berjalan."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (status === "rejected" || status === "canceled") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-red-100 text-red-700">
              <XCircle className="size-5" />
            </div>
            <div>
              <CardTitle>Request ditolak</CardTitle>
              <CardDescription>
                {request.rejectionReason ?? "Request tidak dapat disetujui saat ini."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (status === "activation_expired") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-zinc-100 text-zinc-500">
              <Clock className="size-5" />
            </div>
            <div>
              <CardTitle>Persetujuan kedaluwarsa</CardTitle>
              <CardDescription>
                Batas waktu aktivasi telah terlewati. Ajukan ulang request trial Anda.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return null;
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
  const [form, setForm] = useState({
    businessName: "",
    city: "",
    intendedUse: "",
    contactPhone: "",
    eventDate: "",
  });

  const isTrialing = subscription.status === "trialing";
  const hasActiveRequest =
    trialRequest &&
    !["rejected", "canceled", "activation_expired"].includes(trialRequest.status);
  const canSubmit = !hasActiveRequest && !isTrialing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitTrialRequest({
        organizationId: "", // filled server-side from context
        deviceId: "",       // filled server-side from context
        businessName: form.businessName || null,
        city: form.city || null,
        intendedUse: form.intendedUse || null,
        contactPhone: form.contactPhone || null,
        eventDate: form.eventDate || null,
      });
      if (result.autoRejected) {
        toast.error(
          "Request otomatis ditolak karena terdeteksi duplikasi. Hubungi support jika ini adalah kekeliruan.",
        );
      } else {
        toast.success("Request trial berhasil diajukan. Super Admin akan meninjau dalam 1-2 hari kerja.");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengajukan request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Coba POSKART 14 Hari Gratis</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Akses penuh fitur Starter dengan 1 device selama 14 hari tanpa biaya.
        </p>
      </div>

      {isTrialing && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <CardTitle>Trial sedang aktif</CardTitle>
                <CardDescription>
                  {subscription.currentPeriodEnd
                    ? `Berakhir ${new Date(subscription.currentPeriodEnd).toLocaleDateString("id-ID")}.`
                    : "Trial Anda sedang berjalan."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {trialRequest && <StatusCard request={trialRequest} />}

      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle>Ajukan Trial</CardTitle>
            <CardDescription>
              Isi informasi di bawah untuk membantu Super Admin meninjau request Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nama bisnis
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  placeholder="Nama usaha atau event Anda"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Kota</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Jakarta, Surabaya, dll."
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Rencana penggunaan
                </label>
                <textarea
                  rows={3}
                  value={form.intendedUse}
                  onChange={(e) => setForm((f) => ({ ...f, intendedUse: e.target.value }))}
                  placeholder="Ceritakan rencana penggunaan POSKART Anda..."
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nomor HP (opsional)
                  </label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="08xx-xxxx-xxxx"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Tanggal event (opsional)
                  </label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Mengirim..." : "Ajukan Trial"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
        <div className="flex gap-2 text-sm text-zinc-600">
          <Info className="mt-0.5 size-4 shrink-0 text-zinc-400" />
          <p>
            Trial berlaku 14 hari sejak pertama kali diaktifkan di device. Maksimal
            1 device. Data tidak dihapus setelah trial berakhir.
          </p>
        </div>
      </div>
    </div>
  );
}
