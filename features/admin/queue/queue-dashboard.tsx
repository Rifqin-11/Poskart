"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  QrCode,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createQueueEvent,
  deleteQueueEvent,
  markGuestQueueNotified,
  updateGuestQueueStatus,
  updateQueueEventStatus,
} from "@/server/admin/actions/queue-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/features/admin/_components/page-header";
import { StatCard } from "@/features/admin/_components/stat-card";
import { cn, formatDateTime } from "@/lib/utils";
import type {
  GuestQueueEntry,
  GuestQueueStatus,
  QueueDashboardData,
  QueueEvent,
} from "@/types/queue";

function queueNumber(value?: number | null) {
  return value ? value.toString().padStart(3, "0") : "-";
}

function statusVariant(status: GuestQueueStatus) {
  if (status === "waiting") return "warning" as const;
  if (status === "called" || status === "in_session") return "default" as const;
  if (status === "done") return "success" as const;
  return "secondary" as const;
}

function eventStatusVariant(status: QueueEvent["status"]) {
  if (status === "active") return "success" as const;
  if (status === "paused") return "warning" as const;
  return "secondary" as const;
}

function normalizeWhatsApp(phone: string) {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("0")) return `62${cleaned.slice(1)}`;
  return cleaned;
}

function statusLabel(status: GuestQueueStatus) {
  const labels: Record<GuestQueueStatus, string> = {
    waiting: "Waiting",
    called: "Called",
    in_session: "In session",
    done: "Done",
    cancelled: "Cancelled",
    no_show: "No show",
  };
  return labels[status];
}

function CreateQueueEventDialog({
  open,
  onOpenChange,
  pending,
  devices,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  devices: QueueDashboardData["devices"];
  onCreated: (values: {
    name: string;
    description: string;
    deviceId: string | null;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deviceId, setDeviceId] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreated({ name, description, deviceId: deviceId || null });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Create queue QR">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="queue-event-name" className="text-sm font-medium">
            Event name
          </label>
          <Input
            id="queue-event-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekend photobooth queue"
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="queue-event-device" className="text-sm font-medium">
            Event device
          </label>
          <Select
            id="queue-event-device"
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
          >
            <option value="">All published frames</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
                {device.location ? ` · ${device.location}` : ""}
              </option>
            ))}
          </Select>
          <p className="text-xs text-zinc-500">
            Visitor frame previews follow the frame templates assigned to this
            device.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="queue-event-description" className="text-sm font-medium">
            Short note
          </label>
          <Textarea
            id="queue-event-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Shown on the visitor registration page."
            maxLength={280}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            <QrCode className="size-4" />
            {pending ? "Creating..." : "Create QR"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function QueueDashboard({
  data,
  siteUrl,
}: {
  data: QueueDashboardData;
  siteUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const selectedEvent = data.selectedEvent;
  const publicQueueUrl = useMemo(() => {
    if (!selectedEvent) return "";
    const path = `/q/${selectedEvent.publicToken}`;
    return `${siteUrl}${path}`;
  }, [selectedEvent, siteUrl]);

  function refreshToEvent(eventId?: string) {
    router.push(eventId ? `/queue?event=${eventId}` : "/queue");
    router.refresh();
  }

  function runAction(
    action: () => Promise<{ success: boolean; error?: string; eventId?: string }>,
    successMessage: string,
    after?: (eventId?: string) => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Action failed");
        return;
      }
      toast.success(successMessage);
      after?.(result.eventId);
      router.refresh();
    });
  }

  function printQr() {
    if (!selectedEvent || !publicQueueUrl) return;
    const svg = document.getElementById("queue-event-qr")?.outerHTML;
    if (!svg) return;

    const popup = window.open("", "_blank", "width=560,height=720");
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>${selectedEvent.name} Queue QR</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:32px;text-align:center;color:#111}
            .card{border:1px solid #ddd;border-radius:24px;padding:32px;display:inline-block}
            h1{font-size:24px;margin:0 0 8px}
            p{margin:0 0 24px;color:#555}
            svg{width:320px;height:320px}
            .url{margin-top:20px;font-size:12px;word-break:break-all;color:#555}
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${selectedEvent.name}</h1>
            <p>Scan to join the photobooth queue</p>
            ${svg}
            <div class="url">${publicQueueUrl}</div>
          </div>
          <script>window.onload=()=>{window.print();}</script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  function contact(entry: GuestQueueEntry, type: "email" | "wa") {
    startTransition(async () => {
      await markGuestQueueNotified(entry.id);
      router.refresh();
    });

    if (type === "email") {
      window.location.href = `mailto:${entry.visitorEmail}?subject=${encodeURIComponent(
        "Your POSKART queue number is ready",
      )}&body=${encodeURIComponent(
        `Hi ${entry.visitorName}, your queue number ${queueNumber(
          entry.queueNumber,
        )} is ready. Please come to the photobooth cashier.`,
      )}`;
      return;
    }

    window.open(
      `https://wa.me/${normalizeWhatsApp(entry.visitorPhone)}?text=${encodeURIComponent(
        `Hi ${entry.visitorName}, your photobooth queue number ${queueNumber(
          entry.queueNumber,
        )} is ready. Please come to the cashier.`,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const nextEntry = data.metrics.next;
  const currentEntry = data.metrics.current;

  return (
    <div className="space-y-6">
      <CreateQueueEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={isPending}
        devices={data.devices}
        onCreated={(values) => {
          runAction(
            () => createQueueEvent(values),
            "Queue QR created",
            (eventId) => {
              setDialogOpen(false);
              refreshToEvent(eventId);
            },
          );
        }}
      />

      <PageHeader
        title="Queue"
        description="Create printable event QR codes and manage photobooth visitor queues."
        action={
          <Button className="rounded-full" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Create queue QR
          </Button>
        }
      />

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        <StatCard
          title="Current queue"
          value={queueNumber(currentEntry?.queueNumber)}
          description={currentEntry?.visitorName ?? "No active session"}
          icon={CalendarClock}
          className="min-w-[78vw] snap-start sm:min-w-[280px] md:min-w-0"
        />
        <StatCard
          title="Next queue"
          value={queueNumber(nextEntry?.queueNumber)}
          description={nextEntry?.visitorName ?? "No waiting visitor"}
          icon={Users}
          tone="success"
          className="min-w-[78vw] snap-start sm:min-w-[280px] md:min-w-0"
        />
        <StatCard
          title="Total queue"
          value={data.metrics.total.toLocaleString("id-ID")}
          description={`${data.metrics.waiting} waiting · ${data.metrics.done} done`}
          icon={CheckCircle2}
          className="min-w-[78vw] snap-start sm:min-w-[280px] md:min-w-0"
        />
      </div>

      {data.events.length > 0 ? (
        <Card>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm text-zinc-500">Queue event</div>
                  <Select
                    value={selectedEvent?.id ?? ""}
                    onChange={(event) => refreshToEvent(event.target.value)}
                    className="mt-1 max-w-md"
                    aria-label="Select queue event"
                  >
                    {data.events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {selectedEvent ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={printQr}>
                      <QrCode className="size-4" />
                      Print QR
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(publicQueueUrl);
                        toast.success("Queue link copied");
                      }}
                    >
                      <Copy className="size-4" />
                      Copy link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        runAction(
                          () =>
                            updateQueueEventStatus(
                              selectedEvent.id,
                              selectedEvent.status === "active"
                                ? "paused"
                                : "active",
                            ),
                          selectedEvent.status === "active"
                            ? "Queue paused"
                            : "Queue activated",
                        )
                      }
                    >
                      {selectedEvent.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        runAction(
                          () => deleteQueueEvent(selectedEvent.id),
                          "Queue QR deleted",
                          () => refreshToEvent(),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                      Delete QR
                    </Button>
                  </div>
                ) : null}
              </div>

              {selectedEvent ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={eventStatusVariant(selectedEvent.status)}>
                      {selectedEvent.status}
                    </Badge>
                    <span className="text-sm text-zinc-500">
                      Last number: {queueNumber(selectedEvent.lastQueueNumber)}
                    </span>
                  </div>
                  <p className="mt-3 break-all text-sm text-zinc-600">
                    {publicQueueUrl}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
              {selectedEvent ? (
                <>
                  <div className="mx-auto w-fit rounded-2xl bg-white p-3">
                    <QRCode id="queue-event-qr" value={publicQueueUrl} size={200} />
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    Print this QR and place it at the event cashier desk.
                  </p>
                </>
              ) : (
                <div className="grid min-h-56 place-items-center text-zinc-400">
                  <QrCode className="size-8" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <QrCode className="mx-auto size-10 text-zinc-300" />
              <h2 className="mt-4 text-lg font-semibold">No queue QR yet</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Create a QR for your event, print it, and let visitors register
                themselves from their phone.
              </p>
              <Button className="mt-4 rounded-full" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" />
                Create queue QR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next visitor</CardTitle>
        </CardHeader>
        <CardContent>
          {nextEntry ? (
            <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:items-center">
              <div className="rounded-3xl bg-zinc-950 px-4 py-5 text-center text-white">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Number
                </div>
                <div className="mt-1 text-5xl font-black">
                  {queueNumber(nextEntry.queueNumber)}
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold">
                  {nextEntry.visitorName}
                </h3>
                <div className="mt-2 grid gap-1 text-sm text-zinc-500 sm:grid-cols-2">
                  <span className="truncate">{nextEntry.visitorEmail}</span>
                  <span>{nextEntry.visitorPhone}</span>
                  <span>Registered {formatDateTime(nextEntry.createdAt)}</span>
                  <span>
                    {nextEntry.notifiedAt
                      ? `Notified ${formatDateTime(nextEntry.notifiedAt)}`
                      : "Not notified yet"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  onClick={() =>
                    runAction(
                      () => updateGuestQueueStatus(nextEntry.id, "in_session"),
                      "Visitor moved to session",
                    )
                  }
                >
                  <Play className="size-4" />
                  Start session
                </Button>
                <Button variant="outline" onClick={() => contact(nextEntry, "email")}>
                  <Mail className="size-4" />
                  Email
                </Button>
                <Button variant="outline" onClick={() => contact(nextEntry, "wa")}>
                  <MessageCircle className="size-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-center text-sm text-zinc-500">
              No waiting visitor for the selected queue event.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue list</CardTitle>
        </CardHeader>
        <CardContent>
          {data.entries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-semibold">
                        {queueNumber(entry.queueNumber)}
                      </TableCell>
                      <TableCell>{entry.visitorName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{entry.visitorPhone}</div>
                          <div className="text-xs text-zinc-500">
                            {entry.visitorEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant(entry.status)}
                          className="capitalize"
                        >
                          {statusLabel(entry.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              runAction(
                                () =>
                                  updateGuestQueueStatus(entry.id, "in_session"),
                                "Visitor moved to session",
                              )
                            }
                            disabled={entry.status === "done"}
                          >
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => contact(entry, "wa")}
                          >
                            WA
                          </Button>
                          <Select
                            value={entry.status}
                            onChange={(event) =>
                              runAction(
                                () =>
                                  updateGuestQueueStatus(
                                    entry.id,
                                    event.target.value as GuestQueueStatus,
                                  ),
                                "Queue status updated",
                              )
                            }
                            aria-label="Change queue status"
                            className="h-8 w-32 text-xs"
                          >
                            <option value="waiting">Waiting</option>
                            <option value="called">Called</option>
                            <option value="in_session">In session</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No show</option>
                          </Select>
                          <Link
                            href={`/q/ticket/${entry.publicToken}`}
                            target="_blank"
                            className={cn(
                              "grid size-8 place-items-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
                            )}
                            aria-label="Open ticket"
                          >
                            <MoreHorizontal className="size-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-center text-sm text-zinc-500">
              Queue entries will appear here after visitors scan the event QR.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
