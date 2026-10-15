"use client";

import { useMemo, useState } from "react";
import { Clipboard, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { useSuperAdminSystemLogs } from "@/features/admin/superadmin/use-superadmin";
import type { SuperAdminSystemLog } from "@/server/admin/actions/superadmin-system-log-actions";

const levels = ["all", "debug", "info", "warning", "error", "fatal"] as const;
const formatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Jakarta" });

export function SystemLogManagement() {
  const [level, setLevel] = useState<(typeof levels)[number]>("all");
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useSuperAdminSystemLogs();
  const logs = useMemo(() => data.filter((item) => {
    const query = search.toLowerCase().trim();
    const matchesLevel = level === "all" || item.level === level;
    return matchesLevel && (!query || [item.eventId, item.traceId, item.requestId, item.eventName, item.message].some((value) => value?.toLowerCase().includes(query)));
  }), [data, level, search]);

  const copy = (item: SuperAdminSystemLog) => void navigator.clipboard.writeText(JSON.stringify(item, null, 2)).then(() => toast.success("Log details copied"));

  return <div className="space-y-4">
    <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
      <Select aria-label="Filter log level" value={level} onChange={(event) => setLevel(event.target.value as (typeof levels)[number])}>{levels.map((item) => <option key={item} value={item}>{item === "all" ? "All levels" : item}</option>)}</Select>
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event, message, trace ID, request ID..." className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-950" />
    </div>
    {isLoading ? <div className="space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div> : logs.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 text-center"><FileText className="mb-3 size-8 text-zinc-400" /><p className="text-sm font-semibold">No matching application logs</p><p className="mt-1 text-xs text-zinc-500">Structured logs will appear here as the application records events.</p></div> : <div className="space-y-3">{logs.map((item) => <article key={item.id} className="rounded-3xl border border-zinc-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant={item.level === "error" || item.level === "fatal" ? "destructive" : item.level === "warning" ? "warning" : "secondary"}>{item.level}</Badge><code className="text-xs font-semibold text-zinc-500">{item.eventName}</code></div><p className="break-words text-sm font-semibold text-zinc-950">{item.message}</p><div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2"><span>{formatter.format(new Date(item.createdAt))}</span><span>Service: {item.service}{item.module ? ` · ${item.module}` : ""}</span>{item.eventId ? <span>Event: {item.eventId}</span> : null}{item.traceId ? <span>Trace: {item.traceId}</span> : null}{item.requestId ? <span>Request: {item.requestId}</span> : null}{item.resourceId ? <span>Resource: {item.resourceType ?? "resource"} · {item.resourceId}</span> : null}</div></div><button type="button" aria-label="Copy log details" onClick={() => copy(item)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"><Clipboard className="size-4" /></button></div>{Object.keys(item.metadata).length ? <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px] leading-5 text-zinc-600">{JSON.stringify(item.metadata, null, 2)}</pre> : null}</article>)}</div>}
  </div>;
}
