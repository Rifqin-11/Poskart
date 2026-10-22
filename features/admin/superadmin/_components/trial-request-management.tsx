"use client";

import { useState } from "react";
import { LoaderCircle, XCircle } from "lucide-react";
import { showErrorToast, toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
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
  useRevokeTrialByRequestId,
} from "@/features/admin/superadmin/use-superadmin";
import { formatDateTime } from "@/lib/utils";
import type { TrialRequest, TrialRequestStatus } from "@/types/trial";

const STATUS_OPTIONS: { label: string; value: TrialRequestStatus | "all" }[] = [
  { label: "Semua", value: "all" },
  { label: "Pernah diaktifkan", value: "activated" },
  { label: "Dibatalkan", value: "canceled" },
  { label: "Pengajuan lama", value: "pending" },
  { label: "Ditolak", value: "rejected" },
  { label: "Kedaluwarsa", value: "activation_expired" },
];

function statusVariant(request: TrialRequest) {
  if (request.claimStatus === "revoked") return "destructive" as const;
  if (request.claimStatus === "expired" || request.claimStatus === "converted") return "secondary" as const;
  const status = request.status;
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

function statusLabel(request: TrialRequest) {
  if (request.claimStatus === "revoked") return "Dicabut";
  if (request.claimStatus === "expired") return "Berakhir";
  if (request.claimStatus === "converted") return "Berlangganan";
  const status = request.status;
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
  const revoke = useRevokeTrialByRequestId();
  const [revokeTarget, setRevokeTarget] = useState<TrialRequest | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const requests = data?.items ?? [];
  const total = data?.total ?? 0;
  const isTableLoading = isLoading || (isFetching && isPlaceholderData);

  function handleRevoke() {
    if (!revokeTarget) return;
    revoke.mutate(
      { requestId: revokeTarget.id, reason: revokeReason.trim() },
      {
        onSuccess: () => {
          toast.success("Trial dicabut. Organisasi tidak dapat memulai trial kembali.");
          setRevokeTarget(null);
          setRevokeReason("");
        },
        onError: (err) => showErrorToast("Tidak dapat mencabut trial", err, "Trial belum dicabut."),
      },
    );
  }

  return (
    <Card>
      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => { if (!open && !revoke.isPending) setRevokeTarget(null); }}
        title="Cabut trial organisasi?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Trial &quot;{revokeTarget?.organizationName ?? revokeTarget?.emailSnapshot}&quot; akan dihentikan
            dan kembali ke Free. Data tidak dihapus, tetapi jatah trial tetap terpakai.
          </p>
          <label className="block space-y-2 text-sm font-medium">
            <span>Alasan pencabutan</span>
            <textarea
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              minLength={5}
              maxLength={1000}
              rows={3}
              disabled={revoke.isPending}
              placeholder="Jelaskan indikasi abuse (minimal 5 karakter)"
              className="w-full rounded-xl border border-zinc-200 p-3 text-sm font-normal"
            />
          </label>
          <p className="text-xs text-zinc-400">Alasan dicatat dalam riwayat dan dapat dilihat pemilik organisasi.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={revoke.isPending} onClick={() => setRevokeTarget(null)}>Batal</Button>
            <Button variant="destructive" disabled={revoke.isPending || revokeReason.trim().length < 5} onClick={handleRevoke}>
              {revoke.isPending && <LoaderCircle className="size-4 animate-spin" />}
              Cabut Trial
            </Button>
          </div>
        </div>
      </Dialog>
      <CardHeader>
        <CardTitle>Trial Organisasi</CardTitle>
        <CardDescription>
          Trial langsung aktif selama 14 hari, sekali per organisasi dan email. Cabut trial jika terindikasi abuse.
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
                    Belum ada riwayat trial.
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
                        <Badge variant={statusVariant(req)}>
                          {statusLabel(req)}
                        </Badge>
                        {req.trialEndsAt && <p className="mt-1 text-xs text-zinc-400">Berakhir {formatDateTime(req.trialEndsAt)}</p>}
                        {req.revokeReason && <p className="mt-1 max-w-xs text-xs text-zinc-500">{req.revokeReason}</p>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-zinc-500">
                      {formatDateTime(req.createdAt)}
                    </TableCell>
                    <TableCell>
                      {req.claimStatus === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revoke.isPending}
                          onClick={() => { setRevokeTarget(req); setRevokeReason(""); }}
                          className="text-zinc-400 hover:text-red-500"
                        >
                          {revoke.isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <XCircle className="size-4" />
                          )}
                          Cabut Trial
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
