"use client";

import { useEffect, useState } from "react";
import {
  useApproveVoucherRequest,
  useBooths,
  useRejectVoucherRequest,
} from "@/features/admin/devices/use-devices";
import type { Device } from "@/types/device";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import { EmptyState } from "@/features/admin/_components/empty-state";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  Ticket,
  AlertCircle,
  Search,
  MonitorSmartphone,
  RefreshCw,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const VOUCHER_REQUEST_TTL_MS = 5 * 60 * 1000;

function parseVoucherRequestTime(device: Device) {
  if (!device.voucherRequestedAt) return null;
  const time = Date.parse(device.voucherRequestedAt);
  return Number.isNaN(time) ? null : time;
}

function isActiveVoucherRequest(device: Device, now: number) {
  const requestedAt = parseVoucherRequestTime(device);
  return requestedAt != null && now - requestedAt < VOUCHER_REQUEST_TTL_MS;
}

function formatDateTimeLabel(value: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimeLeft(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes <= 0) return `${restSeconds} detik`;
  return `${minutes}m ${String(restSeconds).padStart(2, "0")}d`;
}

export function VoucherApproval() {
  const { data: devices = [], refetch, isLoading } = useBooths();
  const approveVoucher = useApproveVoucherRequest();
  const rejectVoucher = useRejectVoucherRequest();

  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Filter devices that are currently waiting for vouchers
  const waitingDevices = devices.filter((d: Device) =>
    isActiveVoucherRequest(d, now),
  );

  // Filter other devices (not waiting)
  const otherDevices = devices.filter((d: Device) => {
    const matchSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.location && d.location.toLowerCase().includes(search.toLowerCase()));
    return !isActiveVoucherRequest(d, now) && matchSearch;
  });

  const handleApprove = async () => {
    if (!selectedDevice) return;
    const code = "FREE";

    try {
      await approveVoucher.mutateAsync({
        id: selectedDevice.id,
        code,
      });
      toast.success(`Voucher approved and sent to ${selectedDevice.name}`);
      setSelectedDevice(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send voucher",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voucher Approval"
        description="Approve voucher requests from your photobooth devices remotely."
        action={
          <Button
            variant="outline"
            onClick={() => {
              void refetch();
              toast.message("Refreshing device list…");
            }}
          >
            <RefreshCw className="size-4 mr-2" /> Refresh status
          </Button>
        }
      />

      {/* Dialog to confirm voucher sending */}
      <Dialog
        open={Boolean(selectedDevice)}
        title="Confirm Voucher Action"
        onOpenChange={(open) => !open && setSelectedDevice(null)}
        className="max-w-md"
      >
        <form
          className="space-y-4 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleApprove();
          }}
        >
          <p className="text-sm text-zinc-600">
            Are you sure you want to send a voucher to{" "}
            <strong className="text-zinc-900">{selectedDevice?.name}</strong>?
          </p>

          <DialogActions
            submitting={approveVoucher.isPending}
            submitLabel="Yes, Send"
            submittingLabel="Sending..."
            onCancel={() => setSelectedDevice(null)}
          />
        </form>
      </Dialog>

      {/* 1. WAITING DEVICES PANEL (High Priority) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Waiting Approval ({waitingDevices.length})
        </h2>

        {waitingDevices.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {waitingDevices.map((device: Device) => {
              const requestedAt = parseVoucherRequestTime(device) ?? now;
              const expiresAt = requestedAt + VOUCHER_REQUEST_TTL_MS;
              const timeLeft = expiresAt - now;
              return (
                <Card
                  key={device.id}
                  className="relative overflow-hidden border-yellow-200 bg-yellow-50/20 shadow-sm transition-all"
                >
                  {/* Pulsing top border decorator */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-yellow-400 animate-pulse" />
                  <CardHeader className="pb-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <MonitorSmartphone className="size-5 shrink-0 text-yellow-600" />
                          {device.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Kiosk is waiting for voucher activation
                        </CardDescription>
                      </div>
                      <Badge
                        variant="warning"
                        className="animate-pulse bg-yellow-100 text-yellow-800 border-yellow-200"
                      >
                        Waiting Voucher
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 rounded-lg border border-yellow-100/50 bg-white/70 p-3 text-sm text-zinc-600">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="size-5 shrink-0 text-yellow-600" />
                        <div>
                          A user on this device selected{" "}
                          <strong>Gunakan Voucher</strong>. Tap approve to allow
                          them to proceed.
                        </div>
                      </div>
                      <div className="grid gap-1 border-t border-yellow-100 pt-2 text-xs text-zinc-500 sm:grid-cols-3">
                        <span>
                          Request:{" "}
                          <strong className="text-zinc-700">
                            {formatDateTimeLabel(requestedAt)}
                          </strong>
                        </span>
                        <span>
                          Expired:{" "}
                          <strong className="text-zinc-700">
                            {formatDateTimeLabel(expiresAt)}
                          </strong>
                        </span>
                        <span>
                          Sisa:{" "}
                          <strong className="text-yellow-700">
                            {formatTimeLeft(timeLeft)}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Button
                        className="bg-yellow-600 font-semibold text-white shadow-sm hover:bg-yellow-700"
                        onClick={() => setSelectedDevice(device)}
                      >
                        <Ticket className="size-4 mr-2" /> Approve Voucher
                      </Button>
                      <Button
                        variant="outline"
                        className="border-yellow-200 hover:bg-yellow-50 text-zinc-700"
                        disabled={rejectVoucher.isPending}
                        onClick={async () => {
                          try {
                            await rejectVoucher.mutateAsync(device.id);
                            toast.success(
                              `Request cancelled for ${device.name}`,
                            );
                          } catch {
                            toast.error("Failed to cancel request");
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="All Devices Clear"
            description="No active voucher approval requests. When a kiosk enters the voucher sheet, it will appear here in real time."
            icon={MonitorSmartphone}
            className="py-10"
          />
        )}
      </div>

      {/* 2. OTHER DEVICES LIST */}
      <div className="space-y-3 pt-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Other Online Kiosks ({otherDevices.length})
          </h2>
          <div className="relative w-full xl:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search devices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="size-8 animate-spin text-zinc-400" />
          </div>
        ) : otherDevices.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {otherDevices.map((device: Device) => {
              const isOnline = device.status === "online";
              return (
                <Card
                  key={device.id}
                  className="bg-white hover:border-zinc-300 transition-all"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-medium">
                        <MonitorSmartphone className="size-4 shrink-0 text-zinc-500" />
                        {device.name}
                      </CardTitle>
                      <Badge
                        variant={
                          device.status === "online"
                            ? "success"
                            : device.status === "maintenance"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {device.status}
                      </Badge>
                    </div>
                    {device.location && (
                      <CardDescription className="text-xs truncate">
                        Location: {device.location}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mt-3 grid gap-1 text-xs text-zinc-400 sm:grid-cols-2">
                      <span>Battery: {device.battery}%</span>
                      <span className="sm:text-right">Sync: {device.lastSync}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 border-zinc-200 hover:bg-zinc-50 text-xs"
                      disabled={!isOnline}
                      onClick={() => setSelectedDevice(device)}
                    >
                      <Send className="size-3.5 mr-1.5" />
                      Proactively Send Voucher
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No other devices found"
            description="Adjust the search term or refresh the device list."
            icon={MonitorSmartphone}
            className="py-10"
          />
        )}
      </div>
    </div>
  );
}
