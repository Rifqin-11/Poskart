"use client";

import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  useFailedPrintsByBooth,
  useRetryPrint,
} from "@/features/admin/transactions/use-transactions";
import { formatCurrency } from "@/lib/utils";
import type { Device } from "@/types/device";

type FailedPrintsDialogProps = {
  device: Device;
  onClose: () => void;
};

export function FailedPrintsDialog({
  device,
  onClose,
}: FailedPrintsDialogProps) {
  const { data = [], isLoading, refetch } = useFailedPrintsByBooth(device.name);
  const retry = useRetryPrint();

  const handleRetry = (transactionId: string) => {
    retry.mutate(transactionId, {
      onSuccess: () => {
        toast.success("Reprint queued");
        void refetch();
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Reprint failed"),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Failed prints — ${device.name}`}
    >
      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-zinc-500">
          <Printer className="size-6 text-zinc-300" />
          No failed or pending prints right now.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">
                    {tx.id}
                  </span>
                  <Badge
                    variant={
                      tx.printStatus === "failed"
                        ? "destructive"
                        : tx.printStatus === "reprinting"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {tx.printStatus}
                  </Badge>
                  <span className="text-[11px] text-zinc-400">
                    attempts: {tx.printAttempts}
                  </span>
                </div>
                <div className="mt-1 truncate text-sm font-medium text-zinc-800">
                  {tx.packageName} · {formatCurrency(tx.amount)}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {tx.createdAt}
                  {tx.printLastError ? ` · ${tx.printLastError}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                disabled={retry.isPending || tx.printStatus === "reprinting"}
                onClick={() => handleRetry(tx.id)}
              >
                <Printer className="size-3.5" />
                {tx.printStatus === "reprinting" ? "Queued…" : "Reprint"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
