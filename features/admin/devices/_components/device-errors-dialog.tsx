"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeviceErrors,
  useSetDeviceErrorResolved,
} from "@/features/admin/devices/use-devices";
import type { Device } from "@/types/device";
import type {
  DeviceErrorCategory,
  DeviceErrorGroup,
} from "@/types/device-error";

type DeviceErrorsDialogProps = {
  device: Device;
  canResolve: boolean;
  onClose: () => void;
};

const categories: Array<DeviceErrorCategory | "all"> = [
  "all",
  "startup",
  "runtime",
  "payment",
  "camera",
  "printer",
  "upload",
  "sync",
  "unknown",
];

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Jakarta",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function buildClipboardText(device: Device, error: DeviceErrorGroup) {
  return [
    `Device: ${device.name} (${device.id})`,
    `Category: ${error.category}`,
    `Severity: ${error.severity}`,
    `Occurrences: ${error.occurrenceCount}`,
    `First seen: ${formatDate(error.firstSeen)}`,
    `Last seen: ${formatDate(error.lastSeen)}`,
    error.appVersion ? `App version: ${error.appVersion}` : null,
    `Message: ${error.message}`,
    Object.keys(error.context).length > 0
      ? `Context: ${JSON.stringify(error.context, null, 2)}`
      : null,
    error.stackTrace ? `Stack trace:\n${error.stackTrace}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function DeviceErrorsDialog({
  device,
  canResolve,
  onClose,
}: DeviceErrorsDialogProps) {
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [category, setCategory] = useState<DeviceErrorCategory | "all">("all");
  const { data = [], isLoading, isFetching } = useDeviceErrors(device.id);
  const resolveError = useSetDeviceErrorResolved();

  const filteredErrors = useMemo(
    () =>
      data.filter((item) => {
        const matchesStatus =
          status === "all" ||
          (status === "resolved"
            ? Boolean(item.resolvedAt)
            : !item.resolvedAt);
        const matchesCategory =
          category === "all" || item.category === category;
        return matchesStatus && matchesCategory;
      }),
    [category, data, status],
  );

  const handleResolve = (item: DeviceErrorGroup) => {
    const resolved = !item.resolvedAt;
    resolveError.mutate(
      { errorId: item.id, resolved },
      {
        onSuccess: () =>
          toast.success(resolved ? "Error marked as resolved" : "Error reopened"),
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : "Unable to update error",
          ),
      },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Device errors — ${device.name}`}
      className="max-w-4xl"
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Select
          aria-label="Filter error status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "open" | "resolved" | "all")
          }
        >
          <option value="open">Unresolved errors</option>
          <option value="resolved">Resolved errors</option>
          <option value="all">All statuses</option>
        </Select>
        <Select
          aria-label="Filter error category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as DeviceErrorCategory | "all")
          }
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item === "all"
                ? "All categories"
                : `${item.charAt(0).toUpperCase()}${item.slice(1)}`}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : filteredErrors.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
          <CheckCircle2 className="mb-3 size-8 text-emerald-600" />
          <p className="text-sm font-semibold text-zinc-900">
            No matching device errors
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            New reports will appear automatically while this dialog is open.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map((item) => (
            <article
              key={item.id}
              className={
                item.resolvedAt
                  ? "rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  : "rounded-2xl border border-red-200 bg-red-50/50 p-4"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        item.severity === "warning"
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {item.severity}
                    </Badge>
                    <Badge variant="secondary">{item.category}</Badge>
                    <span className="text-xs font-medium text-zinc-500">
                      {item.occurrenceCount} occurrence
                      {item.occurrenceCount === 1 ? "" : "s"}
                    </span>
                    {item.resolvedAt ? (
                      <Badge variant="success">resolved</Badge>
                    ) : null}
                  </div>
                  <p className="break-words text-sm font-semibold leading-6 text-zinc-950">
                    {item.message}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>First: {formatDate(item.firstSeen)}</span>
                    <span>Last: {formatDate(item.lastSeen)}</span>
                    {item.appVersion ? (
                      <span>App: {item.appVersion}</span>
                    ) : null}
                  </div>
                </div>
                <AlertTriangle
                  className={
                    item.resolvedAt
                      ? "size-5 text-zinc-400"
                      : "size-5 text-red-600"
                  }
                />
              </div>

              {Object.keys(item.context).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(item.context).map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 font-mono text-[11px] text-zinc-600"
                    >
                      {key}={String(value)}
                    </span>
                  ))}
                </div>
              ) : null}

              {item.stackTrace ? (
                <details className="mt-3 rounded-xl border border-zinc-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-700">
                    View stack trace
                  </summary>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border-t border-zinc-100 p-3 text-[11px] leading-5 text-zinc-600">
                    {item.stackTrace}
                  </pre>
                </details>
              ) : null}

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(buildClipboardText(device, item))
                      .then(() => toast.success("Error details copied"))
                      .catch(() => toast.error("Unable to copy error details"));
                  }}
                >
                  <Clipboard className="size-3.5" />
                  Copy details
                </Button>
                {canResolve ? (
                  <Button
                    variant={item.resolvedAt ? "outline" : "default"}
                    size="sm"
                    disabled={resolveError.isPending}
                    onClick={() => handleResolve(item)}
                  >
                    {item.resolvedAt ? (
                      <RotateCcw className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    {item.resolvedAt ? "Reopen" : "Mark resolved"}
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {isFetching && !isLoading ? (
        <p className="mt-3 text-right text-[11px] text-zinc-400">
          Refreshing reports…
        </p>
      ) : null}
    </Dialog>
  );
}
