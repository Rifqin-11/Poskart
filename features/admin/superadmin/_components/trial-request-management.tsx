"use client";

import { useState } from "react";
import { CheckCircle2, Info, LoaderCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  useTrialRequests,
  useReviewTrialRequest,
  useRevokeTrialByRequestId,
} from "@/features/admin/superadmin/use-superadmin";
import { formatDateTime } from "@/lib/utils";
import type { TrialRequest, TrialRequestStatus } from "@/types/trial";

const STATUS_OPTIONS: { label: string; value: TrialRequestStatus | "all" }[] = [
  { label: "Semua", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Perlu Info", value: "needs_information" },
  { label: "Disetujui", value: "approved" },
  { label: "Aktif", value: "activated" },
  { label: "Ditolak", value: "rejected" },
  { label: "Kedaluwarsa", value: "activation_expired" },
];

function statusVariant(status: TrialRequestStatus) {
  switch (status) {
    case "pending": return "warning" as const;
    case "needs_information": return "warning" as const;
    case "approved": return "secondary" as const;
    case "activated": return "success" as const;
    case "rejected": return "destructive" as const;
    case "canceled": return "secondary" as const;
    case "activation_expired": return "secondary" as const;
  }
}

function statusLabel(status: TrialRequestStatus) {
  switch (status) {
    case "pending": return "Pending";
    case "needs_information": return "Perlu Info";
    case "approved": return "Disetujui";
    case "activated": return "Aktif";
    case "rejected": return "Ditolak";
    case "canceled": return "Dibatalkan";
    case "activation_expired": return "Kedaluwarsa";
  }
}

function RiskBadges({ flags }: { flags: string[] }) {
  if (!flags.length) return <span className="text-xs text-zinc-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f} variant="destructive" className="text-[10px]">
          {f.replace("_", " ")}
        </Badge>
      ))}
    </div>
  );
}

export function TrialRequestManagement() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TrialRequestStatus | "all">("all");
  const pageSize = 15;

  const { data, isFetching, isLoading, isPlaceholderData } = useTrialRequests({
    status: statusFilter,
    page,
    pageSize,
  });
  const review = useReviewTrialRequest();
  const revoke = useRevokeTrialByRequestId();
  const confirmDialog = useConfirmDialog();

  const requests = data?.items ?? [];
  const total = data?.total ?? 0;
  const isTableLoading = isLoading || (isFetching && isPlaceholderData);

  function handleApprove(request: TrialRequest) {
    confirmDialog.confirm({
      title: "Setujui trial request?",
      description: `Organisasi "${request.organizationName ?? request.organizationId}" akan mendapatkan persetujuan trial 14 hari. Device harus mengaktifkan dalam 72 jam.`,
      confirmLabel: "Setujui",
      onConfirm: () => {
        review.mutate(
          { requestId: request.id, decision: "approved", note: "Approved by superadmin" },
          {
            onSuccess: () => toast.success("Trial request disetujui."),
            onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyetujui."),
          },
        );
      },
    });
  }

  function handleReject(request: TrialRequest) {
    confirmDialog.confirm({
      title: "Tolak trial request?",
      description: `Request dari "${request.emailSnapshot}" akan ditolak.`,
      confirmLabel: "Tolak",
      destructive: true,
      onConfirm: () => {
        review.mutate(
          { requestId: request.id, decision: "rejected", rejectionCode: "manual_reject", note: "Rejected by superadmin" },
          {
            onSuccess: () => toast.success("Trial request ditolak."),
            onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menolak."),
          },
        );
      },
    });
  }

  function handleNeedsInfo(request: TrialRequest) {
    confirmDialog.confirm({
      title: "Minta informasi tambahan?",
      description: `Request dari "${request.emailSnapshot}" akan dikembalikan ke pemohon untuk melengkapi informasi.`,
      confirmLabel: "Kirim",
      onConfirm: () => {
        review.mutate(
          { requestId: request.id, decision: "needs_information", note: "Informasi tambahan diperlukan." },
          {
            onSuccess: () => toast.success("Status diperbarui."),
            onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal memperbarui."),
          },
        );
      },
    });
  }

  function handleRevoke(request: TrialRequest) {
    confirmDialog.confirm({
      title: "Batalkan trial?",
      description: `Trial aktif organisasi "${request.organizationName ?? request.emailSnapshot}" akan dibatalkan dan subscription dikembalikan ke free.`,
      confirmLabel: "Batalkan Trial",
      destructive: true,
      onConfirm: () => {
        revoke.mutate(
          { requestId: request.id, reason: "Revoked by superadmin" },
          {
            onSuccess: () => toast.success("Trial dibatalkan."),
            onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal membatalkan trial."),
          },
        );
      },
    });
  }

  return (
    <Card>
      {confirmDialog.dialog}
      <CardHeader>
        <CardTitle>Trial Requests</CardTitle>
        <CardDescription>
          Tinjau dan proses pengajuan trial 14 hari dari organisasi baru.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === opt.value
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Organisasi</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Kota</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Diajukan</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-zinc-400">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-zinc-400">
                    Tidak ada trial request.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {req.organizationName ?? "—"}
                      </div>
                      {req.businessName && (
                        <div className="text-xs text-zinc-400">{req.businessName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{req.emailSnapshot}</TableCell>
                    <TableCell className="text-sm text-zinc-500">{req.city ?? "—"}</TableCell>
                    <TableCell>
                      <RiskBadges flags={req.riskFlags} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(req.status)}>
                        {statusLabel(req.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-zinc-500">
                      {formatDateTime(req.createdAt)}
                    </TableCell>
                    <TableCell>
                      {(req.status === "pending" || req.status === "needs_information") && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={review.isPending}
                            onClick={() => handleApprove(req)}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            {review.isPending ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={review.isPending}
                            onClick={() => handleNeedsInfo(req)}
                            className="text-zinc-400 hover:text-zinc-700"
                          >
                            <Info className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={review.isPending}
                            onClick={() => handleReject(req)}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <XCircle className="size-4" />
                          </Button>
                        </div>
                      )}
                      {req.status === "activated" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revoke.isPending}
                          onClick={() => handleRevoke(req)}
                          className="text-zinc-400 hover:text-red-500"
                        >
                          {revoke.isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <XCircle className="size-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3">
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
          />
        </div>
      </CardContent>
    </Card>
  );
}
