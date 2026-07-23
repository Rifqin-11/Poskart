"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ActivePrintJob = {
  id: string;
  deviceId: string;
  deviceName: string;
  gallerySessionId: string | null;
  templateName: string;
  sourceUrl: string;
  copies: number;
  status: "queued" | "processing";
  attempts: number;
  requestedAt: string;
  startedAt: string | null;
};

const printQueueKey = ["active-device-print-jobs"] as const;

async function fetchPrintQueue(): Promise<ActivePrintJob[]> {
  const response = await fetch("/api/admin/print-jobs", {
    cache: "no-store",
  });
  const body = (await response.json()) as {
    jobs?: ActivePrintJob[];
    error?: string;
  };
  if (!response.ok)
    throw new Error(body.error || "Gagal memuat antrean print.");
  return body.jobs ?? [];
}

async function cancelPrintJob(jobId: string) {
  const response = await fetch("/api/admin/print-jobs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error || "Gagal membatalkan print.");
  }
}

export function PrintQueuePanel() {
  const queryClient = useQueryClient();
  const { data: jobs = [] } = useQuery({
    queryKey: printQueueKey,
    queryFn: fetchPrintQueue,
    // Realtime invalidates this query as soon as a job changes. Polling stays
    // as a fallback only: keep it responsive while work exists, but avoid a
    // permanent 5-second API/DB request from every open admin tab.
    refetchInterval: (query) =>
      (query.state.data?.length ?? 0) > 0 ? 5_000 : 45_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const cancelJob = useMutation({
    mutationFn: cancelPrintJob,
    onSuccess: () => {
      toast.success("Antrean print dibatalkan");
      void queryClient.invalidateQueries({ queryKey: printQueueKey });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Gagal membatalkan print.",
      );
      void queryClient.invalidateQueries({ queryKey: printQueueKey });
    },
  });

  if (jobs.length === 0) return null;

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-2xl shadow-zinc-950/15 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-zinc-950 text-white">
            <Printer className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-zinc-950">
              Antrean print
            </div>
            <div className="text-[11px] text-zinc-500">
              {jobs.length} job aktif
            </div>
          </div>
        </div>
        {jobs.some((job) => job.status === "processing") ? (
          <Loader2 className="size-4 animate-spin text-zinc-400" />
        ) : null}
      </div>

      <div className="max-h-[min(28rem,60vh)] space-y-2 overflow-y-auto p-3">
        {jobs.map((job) => {
          const cancelling =
            cancelJob.isPending && cancelJob.variables === job.id;
          return (
            <div
              key={job.id}
              className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-2.5"
            >
              <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={job.sourceUrl}
                  alt={job.templateName}
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900">
                      {job.templateName}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {job.deviceName} · {job.copies} copy
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Batalkan print ${job.templateName}`}
                    title={
                      job.status === "queued"
                        ? "Batalkan antrean"
                        : "Print sedang diproses dan tidak dapat dibatalkan"
                    }
                    disabled={job.status !== "queued" || cancelling}
                    onClick={() => cancelJob.mutate(job.id)}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {cancelling ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant={job.status === "queued" ? "warning" : "secondary"}
                    className={cn(
                      job.status === "processing" &&
                        "border-blue-200 bg-blue-50 text-blue-700",
                    )}
                  >
                    {job.status === "queued" ? "Queued" : "Processing"}
                  </Badge>
                  {job.attempts > 0 ? (
                    <span className="text-[10px] text-zinc-400">
                      Percobaan {job.attempts}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
