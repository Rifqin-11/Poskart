"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { showErrorToast, toast } from "@/lib/toast";
import {
  useCheckSuperAdminSubscriptionPayment,
  useExportSuperAdminSubscriptionPayments,
  useOverrideSuperAdminSubscriptionPayment,
  useSuperAdminSubscriptionPaymentDetail,
  useSuperAdminSubscriptionPayments,
} from "@/features/admin/superadmin/use-superadmin";
import type {
  AdminSubscriptionPayment,
  AdminSubscriptionPaymentFilters,
  AdminSubscriptionPaymentStatus,
} from "@/features/admin/superadmin/api";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: AdminSubscriptionPaymentStatus | "all"; label: string }> = [
  { value: "all", label: "Semua status" },
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Berhasil" },
  { value: "failed", label: "Gagal" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "expired", label: "Kedaluwarsa" },
];

function statusLabel(status: AdminSubscriptionPaymentStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function statusVariant(status: AdminSubscriptionPaymentStatus) {
  if (status === "paid") return "success" as const;
  if (status === "pending") return "warning" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
}

function StatusBadge({ status }: { status: AdminSubscriptionPaymentStatus }) {
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}

function SummaryCard({
  label,
  value,
  amount,
  icon,
}: {
  label: string;
  value: number;
  amount?: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {value.toLocaleString("id-ID")}
          </p>
          {amount !== undefined ? (
            <p className="mt-1 text-xs text-zinc-500">{formatCurrency(amount)}</p>
          ) : null}
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-zinc-800">{value || "—"}</dd>
    </div>
  );
}

export function SubscriptionPaymentManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminSubscriptionPaymentStatus | "all">("all");
  const [gateway, setGateway] = useState<"all" | "duitku" | "midtrans">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [overridePayment, setOverridePayment] = useState<AdminSubscriptionPayment | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<"paid" | "failed">("paid");
  const [overrideReason, setOverrideReason] = useState("");

  const filters = useMemo<AdminSubscriptionPaymentFilters>(
    () => ({ page, pageSize: PAGE_SIZE, search, status, gateway, from, to }),
    [page, search, status, gateway, from, to],
  );
  const { data, isLoading, isFetching, error } = useSuperAdminSubscriptionPayments(filters);
  const detailQuery = useSuperAdminSubscriptionPaymentDetail(detailId);
  const check = useCheckSuperAdminSubscriptionPayment();
  const override = useOverrideSuperAdminSubscriptionPayment();
  const exportCsv = useExportSuperAdminSubscriptionPayments();
  const summary = data?.summary ?? {
    total: 0,
    pending: 0,
    paid: 0,
    failed: 0,
    cancelled: 0,
    expired: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  };
  const payments = data?.items ?? [];

  function resetFilters() {
    setPage(1);
    setSearch("");
    setStatus("all");
    setGateway("all");
    setFrom("");
    setTo("");
  }

  function handleCheck(payment: AdminSubscriptionPayment) {
    check.mutate(payment.id, {
      onSuccess: (result) => {
        toast.success(
          result?.status === "paid"
            ? "Pembayaran terverifikasi dan subscription diperbarui."
            : "Status gateway sudah diperbarui.",
        );
      },
      onError: (checkError) =>
        showErrorToast(
          "Tidak dapat mengecek pembayaran",
          checkError,
          "Status gateway belum dapat dicek.",
        ),
    });
  }

  function openOverride(payment: AdminSubscriptionPayment) {
    setOverridePayment(payment);
    setOverrideStatus("paid");
    setOverrideReason("");
  }

  function submitOverride() {
    if (!overridePayment) return;
    if (overrideReason.trim().length < 10) {
      toast.warning("Alasan override minimal 10 karakter.");
      return;
    }
    override.mutate(
      { id: overridePayment.id, status: overrideStatus, reason: overrideReason.trim() },
      {
        onSuccess: () => {
          setOverridePayment(null);
          toast.success("Override pembayaran berhasil dicatat.");
        },
        onError: (overrideError) =>
          showErrorToast(
            "Override pembayaran gagal",
            overrideError,
            "Status pembayaran belum diubah.",
          ),
      },
    );
  }

  async function handleExport() {
    try {
      const exportFilters = { ...filters };
      delete exportFilters.page;
      delete exportFilters.pageSize;
      const csv = await exportCsv.mutateAsync(exportFilters);
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `subscription-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Riwayat pembayaran berhasil diekspor.");
    } catch (exportError) {
      showErrorToast(
        "Export pembayaran gagal",
        exportError,
        "CSV pembayaran belum dapat dibuat.",
      );
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Subscription Payments</CardTitle>
              <CardDescription>
                Pantau pembayaran langganan semua organisasi, verifikasi gateway, dan catat override manual.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExport()}
              disabled={exportCsv.isPending}
            >
              {exportCsv.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {exportCsv.isPending ? "Membuat CSV..." : "Export CSV"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total" value={summary.total} icon={<ShieldAlert className="size-4" />} />
            <SummaryCard label="Berhasil" value={summary.paid} amount={summary.paidAmount} icon={<CheckCircle2 className="size-4" />} />
            <SummaryCard label="Menunggu" value={summary.pending} amount={summary.pendingAmount} icon={<Clock3 className="size-4" />} />
            <SummaryCard label="Gagal" value={summary.failed} icon={<XCircle className="size-4" />} />
            <SummaryCard label="Batal / Expired" value={summary.cancelled + summary.expired} icon={<ShieldAlert className="size-4" />} />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(130px,1fr))]">
              <label className="relative block">
                <span className="sr-only">Cari order atau organisasi</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  className="pl-9"
                  placeholder="Cari Order ID atau organisasi..."
                />
              </label>
              <Select value={status} onChange={(event) => { setStatus(event.target.value as AdminSubscriptionPaymentStatus | "all"); setPage(1); }}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Select value={gateway} onChange={(event) => { setGateway(event.target.value as typeof gateway); setPage(1); }}>
                <option value="all">Semua gateway</option>
                <option value="duitku">Duitku</option>
                <option value="midtrans">Midtrans</option>
              </Select>
              <Input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} aria-label="Dari tanggal" />
              <div className="flex gap-2">
                <Input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} aria-label="Sampai tanggal" />
                <Button type="button" variant="ghost" onClick={resetFilters} title="Reset filter">Reset</Button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{error.message}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>Coba lagi</Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-zinc-200">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Organisasi</TableHead>
                  <TableHead>Order / Plan</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-400">Memuat pembayaran...</TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-400">Tidak ada pembayaran sesuai filter.</TableCell></TableRow>
                ) : payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap text-xs text-zinc-500">{formatDateTime(payment.createdAt)}</TableCell>
                    <TableCell>
                      <div className="max-w-44 truncate font-medium text-zinc-950">{payment.organizationName ?? "Tanpa organisasi"}</div>
                      <div className="text-[11px] text-zinc-400">{payment.organizationId ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-zinc-950">{payment.merchantOrderId}</div>
                      <div className="text-xs text-zinc-500">{payment.planName} · {payment.durationMonths} bulan · {payment.deviceCount} device</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-zinc-950">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="capitalize text-sm text-zinc-600">{payment.paymentGateway}</TableCell>
                    <TableCell><StatusBadge status={payment.status} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="sm" variant="ghost" title="Lihat detail" onClick={() => setDetailId(payment.id)}><Eye className="size-4" /></Button>
                        {payment.status !== "paid" ? (
                          <Button type="button" size="sm" variant="ghost" title="Cek gateway" disabled={check.isPending} onClick={() => handleCheck(payment)}>
                            {check.isPending && check.variables === payment.id ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                          </Button>
                        ) : null}
                        {payment.status !== "paid" ? (
                          <Button type="button" size="sm" variant="ghost" title="Override manual" onClick={() => openOverride(payment)}><ShieldAlert className="size-4" /></Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={data?.total ?? 0}
            isLoading={isFetching}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(detailId)} onOpenChange={(open) => { if (!open) setDetailId(null); }} title="Detail subscription payment" className="max-w-4xl">
        {detailQuery.isLoading ? <div className="py-10 text-center text-sm text-zinc-500">Memuat detail...</div> : detailQuery.error ? <div className="text-sm text-red-600">{detailQuery.error.message}</div> : detailQuery.data ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-zinc-950">{detailQuery.data.merchantOrderId}</p>
                <p className="mt-1 text-sm text-zinc-500">{detailQuery.data.organizationName ?? "Tanpa organisasi"}</p>
              </div>
              <StatusBadge status={detailQuery.data.status} />
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Plan" value={`${detailQuery.data.planName} · ${detailQuery.data.durationMonths} bulan`} />
              <DetailField label="Jumlah" value={formatCurrency(detailQuery.data.amount)} />
              <DetailField label="Gateway" value={detailQuery.data.paymentGateway} />
              <DetailField label="Metode pembayaran" value={detailQuery.data.paymentMethod} />
              <DetailField label="Customer" value={`${detailQuery.data.customerName} · ${detailQuery.data.email}`} />
              <DetailField label="WhatsApp" value={detailQuery.data.whatsapp} />
              <DetailField label="Dibuat" value={formatDateTime(detailQuery.data.createdAt)} />
              <DetailField label="Gateway terakhir dicek" value={formatDateTime(detailQuery.data.gatewayStatusCheckedAt ?? undefined)} />
              <DetailField label="Subscription aktif" value={formatDateTime(detailQuery.data.subscriptionActivatedAt ?? undefined)} />
              <DetailField label="Alasan ditutup" value={detailQuery.data.paymentClosedReason} />
              <DetailField label="Dibatalkan pada" value={formatDateTime(detailQuery.data.paymentCancelledAt ?? undefined)} />
              <DetailField label="Gateway dibatalkan pada" value={formatDateTime(detailQuery.data.gatewayCancelledAt ?? undefined)} />
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Riwayat override</p>
              {detailQuery.data.overrides.length === 0 ? <p className="text-sm text-zinc-400">Belum ada override manual.</p> : <div className="space-y-2">{detailQuery.data.overrides.map((entry) => <div key={entry.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{entry.previousStatus} → {entry.nextStatus}</span><span className="text-xs text-zinc-500">{formatDateTime(entry.createdAt)}</span></div><p className="mt-1 text-zinc-600">{entry.reason}</p><p className="mt-1 text-xs text-zinc-400">Admin: {entry.adminProfileId}</p></div>)}</div>}
            </div>
            {detailQuery.data.gatewayResponse ? <details className="rounded-xl border border-zinc-200 p-3"><summary className="cursor-pointer text-sm font-medium">Gateway response</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-500">{JSON.stringify(detailQuery.data.gatewayResponse, null, 2)}</pre></details> : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(overridePayment)} onOpenChange={(open) => { if (!open && !override.isPending) setOverridePayment(null); }} title="Override status pembayaran" className="max-w-lg">
        {overridePayment ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Override manual hanya boleh dipakai setelah bukti pembayaran diverifikasi. Aktivasi subscription untuk status lunas akan diproses secara atomik dan semua perubahan dicatat.
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-950">{overridePayment.merchantOrderId}</p>
              <p className="mt-1 text-zinc-500">{overridePayment.organizationName ?? "Tanpa organisasi"} · {formatCurrency(overridePayment.amount)}</p>
            </div>
            <label className="block text-sm font-medium text-zinc-700">Status baru
              <Select className="mt-2" value={overrideStatus} onChange={(event) => setOverrideStatus(event.target.value as "paid" | "failed")}>
                <option value="paid">Tandai berhasil / lunas</option>
                <option value="failed">Tandai gagal</option>
              </Select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">Alasan wajib
              <textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} rows={4} className="mt-2 flex w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100" placeholder="Contoh: Bukti transfer diverifikasi oleh finance melalui WhatsApp..." />
              <span className="mt-1 block text-xs font-normal text-zinc-400">Minimal 10 karakter. Alasan akan tersimpan di audit.</span>
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={override.isPending} onClick={() => setOverridePayment(null)}>Batal</Button>
              <Button type="button" disabled={override.isPending || overrideReason.trim().length < 10} onClick={submitOverride}>
                {override.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Simpan override
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
