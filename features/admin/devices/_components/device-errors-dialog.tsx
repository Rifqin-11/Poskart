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
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-2 sm:flex-nowrap">
        <Select
          aria-label="Filter error status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "open" | "resolved" | "all")
          }
          className="flex-1 rounded-xl border-transparent bg-white text-sm shadow-sm"
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
          className="flex-1 rounded-xl border-transparent bg-white text-sm shadow-sm"
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
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : filteredErrors.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-50 p-8 text-center ring-1 ring-zinc-200/60">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">No matching errors</p>
            <p className="mt-1 text-xs text-zinc-500">
              New reports will appear automatically while this dialog is open.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map((item) => (
            <article
              key={item.id}
              className={
                item.resolvedAt
                  ? "overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                  : "overflow-hidden rounded-2xl border border-red-200 bg-white"
              }
            >
              {/* Severity accent bar */}
              <div
                className={
                  item.resolvedAt
                    ? "h-1 w-full bg-zinc-200"
                    : item.severity === "warning"
                      ? "h-1 w-full bg-amber-400"
                      : "h-1 w-full bg-red-500"
                }
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Badge row */}
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={
                          item.resolvedAt
                            ? "secondary"
                            : item.severity === "warning"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {item.severity}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {item.category}
                      </Badge>
                      {item.resolvedAt ? (
                        <Badge variant="success">resolved</Badge>
                      ) : null}
                      <span className="ml-1 text-xs text-zinc-400">
                        {item.occurrenceCount}× reported
                      </span>
                    </div>
                    {/* Message */}
                    <p className="break-words text-sm font-semibold leading-5 text-zinc-950">
                      {item.message}
                    </p>
                    {/* Timestamps */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-400">
                      <span>First seen {formatDate(item.firstSeen)}</span>
                      <span className="text-zinc-200">·</span>
                      <span>Last seen {formatDate(item.lastSeen)}</span>
                      {item.appVersion ? (
                        <>
                          <span className="text-zinc-200">·</span>
                          <span className="font-mono">v{item.appVersion}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {/* Icon container */}
                  <div
                    className={
                      item.resolvedAt
                        ? "grid size-8 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-400"
                        : item.severity === "warning"
                          ? "grid size-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-500"
                          : "grid size-8 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"
                    }
                  >
                    <AlertTriangle className="size-4" />
                  </div>
                </div>

                {/* Context tags */}
                {Object.keys(item.context).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(item.context).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-600"
                      >
                        <span className="text-zinc-400">{key}</span>
                        <span className="mx-1 text-zinc-300">=</span>
                        {String(value)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Stack trace */}
                {item.stackTrace ? (
                  <details className="group mt-3 rounded-xl border border-zinc-100 bg-zinc-50">
                    <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900">
                      <span className="inline-block transition-transform group-open:rotate-90">▶</span>
                      Stack trace
                    </summary>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words border-t border-zinc-100 p-3 text-[11px] leading-5 text-zinc-600">
                      {item.stackTrace}
                    </pre>
                  </details>
                ) : null}

                {/* Actions */}
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
                    Copy
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
              </div>
            </article>
          ))}
        </div>
      )}

      {isFetching && !isLoading ? (
        <p className="mt-3 text-right text-xs text-zinc-400">Refreshing reports…</p>
      ) : null}
    </Dialog>
  );
}
