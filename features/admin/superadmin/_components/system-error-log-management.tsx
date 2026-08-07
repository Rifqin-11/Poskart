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
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSetSuperAdminSystemErrorResolved,
  useSuperAdminSystemErrors,
} from "@/features/admin/superadmin/use-superadmin";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import type { SuperAdminSystemError } from "@/server/admin/actions/superadmin-system-error-actions";

const sources: Array<SuperAdminSystemError["source"] | "all"> = [
  "all",
  "route",
  "server_action",
  "render",
  "proxy",
  "web",
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

function buildClipboardText(error: SuperAdminSystemError) {
  return [
    `Reference: ${error.referenceCode}`,
    `Source: ${error.source}`,
    `Severity: ${error.severity}`,
    `Route: ${error.method ?? ""} ${error.route ?? ""}`.trim(),
    `Occurrences: ${error.occurrenceCount}`,
    `First seen: ${formatDate(error.firstSeen)}`,
    `Last seen: ${formatDate(error.lastSeen)}`,
    error.errorType ? `Error type: ${error.errorType}` : null,
    error.requestId ? `Request ID: ${error.requestId}` : null,
    error.digest ? `Digest: ${error.digest}` : null,
    `Message: ${error.message}`,
    Object.keys(error.context).length > 0
      ? `Context: ${JSON.stringify(error.context, null, 2)}`
      : null,
    error.stackTrace ? `Stack trace:\n${error.stackTrace}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function SystemErrorLogManagement() {
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [source, setSource] = useState<SuperAdminSystemError["source"] | "all">("all");
  const { data = [], isLoading, isFetching } = useSuperAdminSystemErrors();
  const resolveError = useSetSuperAdminSystemErrorResolved();
  const filteredErrors = useMemo(
    () =>
      data.filter((item) => {
        const matchesStatus =
          status === "all" ||
          (status === "resolved" ? Boolean(item.resolvedAt) : !item.resolvedAt);
        return matchesStatus && (source === "all" || item.source === source);
      }),
    [data, source, status],
  );

  const handleResolve = (item: SuperAdminSystemError) => {
    const resolved = !item.resolvedAt;
    resolveError.mutate(
      { errorId: item.id, resolved },
      {
        onSuccess: () =>
          toast.success(resolved ? "System error marked as resolved" : "System error reopened"),
        onError: (error) =>
          toast.error(
            getUserFacingErrorMessage(error, "System error status belum dapat diperbarui."),
          ),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select aria-label="Filter system error status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="open">Unresolved errors</option>
          <option value="resolved">Resolved errors</option>
          <option value="all">All statuses</option>
        </Select>
        <Select aria-label="Filter system error source" value={source} onChange={(event) => setSource(event.target.value as typeof source)}>
          {sources.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All sources" : item.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : filteredErrors.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
          <CheckCircle2 className="mb-3 size-8 text-emerald-600" />
          <p className="text-sm font-semibold text-zinc-900">No matching system errors</p>
          <p className="mt-1 text-xs text-zinc-500">Server errors will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map((item) => (
            <article
              key={item.id}
              className={item.resolvedAt ? "rounded-3xl border border-zinc-200 bg-zinc-50 p-4" : "rounded-3xl border border-red-200 bg-red-50/50 p-4"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={item.severity === "warning" ? "warning" : "destructive"}>{item.severity}</Badge>
                    <Badge variant="secondary">{item.source}</Badge>
                    {item.resolvedAt ? <Badge variant="success">resolved</Badge> : null}
                    <code className="text-xs font-semibold text-zinc-500">{item.referenceCode}</code>
                  </div>
                  <p className="break-words text-sm font-semibold leading-6 text-zinc-950">{item.message}</p>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                    <span>{item.method ?? ""} {item.route ?? "Unknown route"}</span>
                    <span>{item.errorType ?? "Unknown error type"}</span>
                    <span>First: {formatDate(item.firstSeen)}</span>
                    <span>Last: {formatDate(item.lastSeen)} · {item.occurrenceCount} occurrence{item.occurrenceCount === 1 ? "" : "s"}</span>
                    {item.requestId ? <span>Request: {item.requestId}</span> : null}
                    {item.digest ? <span>Digest: {item.digest}</span> : null}
                  </div>
                </div>
                <AlertTriangle className={item.resolvedAt ? "size-5 text-zinc-400" : "size-5 text-red-600"} />
              </div>
              {Object.keys(item.context).length > 0 ? (
                <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-white p-3 text-[11px] leading-5 text-zinc-600">{JSON.stringify(item.context, null, 2)}</pre>
              ) : null}
              {item.stackTrace ? (
                <details className="mt-3 rounded-xl border border-zinc-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-700">View stack trace</summary>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border-t border-zinc-100 p-3 text-[11px] leading-5 text-zinc-600">{item.stackTrace}</pre>
                </details>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(buildClipboardText(item)).then(() => toast.success("Error details copied")).catch(() => toast.error("Unable to copy error details"))}>
                  <Clipboard className="size-3.5" /> Copy details
                </Button>
                <Button variant={item.resolvedAt ? "outline" : "default"} size="sm" disabled={resolveError.isPending} onClick={() => handleResolve(item)}>
                  {item.resolvedAt ? <RotateCcw className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                  {item.resolvedAt ? "Reopen" : "Mark resolved"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {isFetching && !isLoading ? <p className="text-right text-[11px] text-zinc-400">Refreshing reports…</p> : null}
    </div>
  );
}
