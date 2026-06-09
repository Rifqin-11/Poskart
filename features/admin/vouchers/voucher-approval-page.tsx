"use client";

import { useState } from "react";
import { useBooths, useUpdateBooth } from "@/features/admin/devices/use-devices";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
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
import {
  Ticket,
  AlertCircle,
  CheckCircle,
  Search,
  MonitorSmartphone,
  RefreshCw,
  Send,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

const PRESET_VOUCHERS = [
  { code: "FREE", label: "Free Session" },
  { code: "PROMO100", label: "100% Promo" },
  { code: "CASH_PAID", label: "Cash paid to cashier" },
  { code: "EVENT_PASS", label: "Event Ticket" },
];

export function VoucherApproval() {
  const { data: devices = [], refetch, isLoading } = useBooths();
  const updateBooth = useUpdateBooth();

  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [customCode, setCustomCode] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("FREE");

  // Filter devices that are currently waiting for vouchers
  const waitingDevices = devices.filter(
    (d) => d.location === "WAITING_VOUCHER"
  );

  // Filter other devices (not waiting)
  const otherDevices = devices.filter((d) => {
    const matchSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.location && d.location.toLowerCase().includes(search.toLowerCase()));
    return d.location !== "WAITING_VOUCHER" && matchSearch;
  });

  const handleApprove = async () => {
    if (!selectedDevice) return;
    const code = (
      customCode.trim() ||
      selectedPreset ||
      "FREE"
    ).toUpperCase();

    try {
      await updateBooth.mutateAsync({
        id: selectedDevice.id,
        patch: {
          location: `VOUCHER:${code}`,
        },
      });
      toast.success(`Voucher "${code}" approved and sent to ${selectedDevice.name}`);
      setSelectedDevice(null);
      setCustomCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve voucher");
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

      {/* Dialog to approve and send voucher */}
      <Dialog
        open={Boolean(selectedDevice)}
        title={`Approve Voucher for ${selectedDevice?.name}`}
        onOpenChange={(open) => !open && setSelectedDevice(null)}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-zinc-500">
            Select a preset voucher code or enter a custom code to approve for this kiosk:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {PRESET_VOUCHERS.map((preset) => {
              const isSelected = selectedPreset === preset.code && !customCode;
              return (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.code);
                    setCustomCode("");
                  }}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-50 font-medium text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50/50"
                  }`}
                >
                  <span className="text-xs font-semibold">{preset.code}</span>
                  <span className="text-[11px] text-zinc-400">{preset.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">
              Custom Voucher Code
            </label>
            <Input
              placeholder="e.g. CUSTOM-CODE"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className="uppercase"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSelectedDevice(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={updateBooth.isPending}
              className="bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {updateBooth.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  Approve & Send
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 1. WAITING DEVICES PANEL (High Priority) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Waiting Approval ({waitingDevices.length})
        </h2>

        {waitingDevices.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {waitingDevices.map((device) => (
              <Card
                key={device.id}
                className="relative overflow-hidden border-yellow-200 bg-yellow-50/20 shadow-sm transition-all"
              >
                {/* Pulsing top border decorator */}
                <div className="absolute top-0 inset-x-0 h-1 bg-yellow-400 animate-pulse" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MonitorSmartphone className="size-5 text-yellow-600" />
                        {device.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Kiosk is waiting for voucher activation
                      </CardDescription>
                    </div>
                    <Badge variant="warning" className="animate-pulse bg-yellow-100 text-yellow-800 border-yellow-200">
                      Waiting Voucher
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-600 bg-white/70 border border-yellow-100/50 rounded-lg p-3">
                    <AlertCircle className="size-5 text-yellow-600 shrink-0" />
                    <div>
                      A user on this device selected <strong>Gunakan Voucher</strong>. Tap approve to allow them to proceed.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold shadow-sm"
                      onClick={() => setSelectedDevice(device)}
                    >
                      <Ticket className="size-4 mr-2" /> Approve Voucher
                    </Button>
                    <Button
                      variant="outline"
                      className="border-yellow-200 hover:bg-yellow-50 text-zinc-700"
                      onClick={async () => {
                        try {
                          await updateBooth.mutateAsync({
                            id: device.id,
                            patch: { location: "" },
                          });
                          toast.success(`Request cancelled for ${device.name}`);
                        } catch (err) {
                          toast.error("Failed to cancel request");
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-zinc-200 bg-zinc-50/50">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
              <CheckCircle className="size-10 text-emerald-500 mb-3" />
              <div className="font-semibold text-zinc-800">All Devices Clear</div>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                No active voucher approval requests. When a kiosk enters the voucher sheet, it will appear here in real time.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. OTHER DEVICES LIST */}
      <div className="space-y-3 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Other Online Kiosks ({otherDevices.length})
          </h2>
          <div className="relative w-full sm:max-w-xs">
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {otherDevices.map((device) => {
              const isOnline = device.status === "online";
              return (
                <Card key={device.id} className="bg-white hover:border-zinc-300 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MonitorSmartphone className="size-4 text-zinc-500" />
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
                    <div className="mt-3 flex justify-between items-center text-xs text-zinc-400">
                      <span>Battery: {device.battery}%</span>
                      <span>Sync: {device.lastSync}</span>
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
          <Card className="border-dashed border-zinc-200">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
              <MonitorSmartphone className="size-8 text-zinc-300 mb-2" />
              <div className="text-sm">No other devices found.</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
