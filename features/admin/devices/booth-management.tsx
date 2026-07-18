"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Battery,
  Plus,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Store,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  useBooths,
  useCreateBooth,
  useDeleteBooth,
  useUpdateBooth,
} from "@/features/admin/devices/use-devices";
import { useLayoutSchemas } from "@/features/admin/layout/use-layout";
import { usePricing } from "@/features/admin/pricing/use-pricing";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
import { useTemplates } from "@/features/admin/templates/use-templates";
import { cn } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type {
  BoothInput,
  LayoutSchemaRow,
  PricingProduct,
  Template,
} from "@/features/admin/devices/api";
import type { Device } from "@/types/device";

import { BoothFormDialog } from "./_components/booth-form-dialog";
import { FailedPrintsDialog } from "./_components/printer-status-logs-dialog";

const EMPTY_BOOTH: BoothInput = {
  name: "",
  location: "",
  status: "online",
  battery: 100,
  appVersion: "1.0.0",
  lastSync: "just now",
  theme: "",
  template: "",
  pricingProfile: "",
  frameTemplates: [],
  pricingProfiles: [],
  sessionCountdownSeconds: null,
  paymentCountdownSeconds: null,
  printerBottomSafeZoneMm: 0,
  printerBrightness: 0,
  printerContrast: 0,
  printerDotDensity: 1,
};

type DeviceFormOptions = {
  themes: string[];
  frameTemplates: string[];
  pricingProducts: PricingProduct[];
};

export function BoothManagement() {
  const { data = [], refetch } = useBooths();
  const { data: subscriptionStatus } = useSubscriptionStatus();
  const { data: layouts = [] } = useLayoutSchemas();
  const { data: templates = [] } = useTemplates();
  const { isReadOnly } = usePermission();
  const { data: pricingProducts = [] } = usePricing();
  const createBooth = useCreateBooth();
  const updateBooth = useUpdateBooth();
  const deleteBooth = useDeleteBooth();
  const [editing, setEditing] = useState<Device | null>(null);
  const [creating, setCreating] = useState(false);
  const [failedFor, setFailedFor] = useState<Device | null>(null);
  const confirmDelete = useConfirmDialog();
  const deviceLimit = subscriptionStatus?.deviceLimit ?? 1;
  const usedDevices = data.length;
  const remainingDevices = Math.max(0, deviceLimit - usedDevices);
  const deviceUsagePercent =
    deviceLimit > 0 ? Math.min(100, (usedDevices / deviceLimit) * 100) : 0;
  const deviceLimitReached = remainingDevices <= 0;

  const deviceFormOptions = useMemo<DeviceFormOptions>(
    () => ({
      themes: layouts
        .map((layout: LayoutSchemaRow) => layout.name)
        .filter(Boolean),
      frameTemplates: templates
        .filter((template: Template) => template.category === "frame")
        .map((template: Template) => template.name)
        .filter(Boolean),
      pricingProducts,
    }),
    [layouts, pricingProducts, templates],
  );

  const handleDelete = (device: Device) => {
    confirmDelete.confirm({
      title: "Delete device?",
      description: `Delete device "${device.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deleteBooth.mutate(device.id, {
          onSuccess: () => toast.success("Device deleted"),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Delete failed"),
        });
      },
    });
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Device Management"
        description="Configure kiosk theme, frame template, pricing package, countdowns, sync status, and remote actions."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void refetch();
                toast.message("Refreshing network…");
              }}
            >
              <RefreshCw className="size-4" /> Refresh network
            </Button>
            <Button
              onClick={() => setCreating(true)}
              disabled={deviceLimitReached || isReadOnly("devices")}
              title={
                isReadOnly("devices")
                  ? "Read-only access"
                  : deviceLimitReached
                    ? "Device limit reached"
                    : "Add device"
              }
            >
              <Plus className="size-4" /> Add device
            </Button>
          </div>
        }
      />
      <Card className="mb-6">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950">
              Device capacity
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {usedDevices} of {deviceLimit} device{deviceLimit > 1 ? "s" : ""}{" "}
              used.{" "}
              <span
                className={
                  deviceLimitReached
                    ? "font-medium text-red-600"
                    : "font-medium text-emerald-700"
                }
              >
                {deviceLimitReached
                  ? "No device slots remaining."
                  : `${remainingDevices} device${remainingDevices > 1 ? "s" : ""} available.`}
              </span>
            </p>
            <Progress value={deviceUsagePercent} className="mt-4" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="text-lg font-semibold text-zinc-950">
                {usedDevices}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Used
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="text-lg font-semibold text-zinc-950">
                {deviceLimit}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Allowed
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div
                className={cn(
                  "text-lg font-semibold",
                  deviceLimitReached ? "text-red-600" : "text-emerald-700",
                )}
              >
                {remainingDevices}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {data.map((device: Device) => (
          <Card key={device.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{device.name}</CardTitle>
                <CardDescription>
                  {device.location} · {device.appVersion}
                </CardDescription>
              </div>
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-zinc-50 p-3">
                  <Battery className="mb-2 size-4" />
                  {device.battery}% battery
                </div>
                <div
                  className={cn(
                    "rounded-md border p-3",
                    device.printerStatus === "ready"
                      ? "border-emerald-200 bg-emerald-50"
                      : device.printerStatus === "unknown"
                        ? "border-zinc-200 bg-zinc-50"
                        : "border-red-200 bg-red-50",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Printer className="size-4 shrink-0" />
                    <Badge
                      variant={
                        device.printerStatus === "ready"
                          ? "success"
                          : device.printerStatus === "unknown"
                            ? "secondary"
                            : "destructive"
                      }
                      className="max-w-full truncate px-1.5 text-[10px]"
                    >
                      {device.printerStatus.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <div className="truncate font-medium text-zinc-900">
                    {device.printerName || "Printer belum dikonfigurasi"}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 line-clamp-2 text-[11px]",
                      device.printerLastError
                        ? "font-medium text-red-700"
                        : "text-zinc-500",
                    )}
                  >
                    {device.printerLastError ||
                      (device.printerBidirectional
                        ? "Status kertas didukung"
                        : "Status koneksi saja")}
                  </div>
                </div>
                <div className="rounded-md bg-zinc-50 p-3">
                  <Store className="mb-2 size-4" />
                  {formatAssignmentList(device.pricingProfiles)}
                </div>
              </div>
              <div className="grid gap-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 sm:grid-cols-2">
                <div className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-zinc-400" />
                  <span>
                    Session:{" "}
                    <span className="font-semibold text-zinc-800">
                      {device.sessionCountdownSeconds
                        ? `${device.sessionCountdownSeconds}s`
                        : "default"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-zinc-400" />
                  <span>
                    Payment:{" "}
                    <span className="font-semibold text-zinc-800">
                      {device.paymentCountdownSeconds
                        ? `${device.paymentCountdownSeconds}s`
                        : "default"}
                    </span>
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className="text-zinc-500">Theme:</span>
                  <span className="font-medium text-zinc-700">
                    {device.theme || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Frame:</span>
                  <span className="font-medium text-zinc-700">
                    {formatAssignmentList(device.frameTemplates)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Price:</span>
                  <span className="font-medium text-zinc-700">
                    {formatAssignmentList(device.pricingProfiles)}
                  </span>
                </div>
                <div className="col-span-2 flex min-w-0 items-center gap-1.5">
                  <BadgeCheck className="size-3.5 shrink-0 text-zinc-400" />
                  <span className="shrink-0 text-zinc-500">Last sync:</span>
                  <span className="truncate font-medium text-zinc-700">
                    {device.lastSync}
                  </span>
                </div>
              </div>
              <Progress value={device.battery} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFailedFor(device)}
                >
                  <Printer className="size-4" /> Failed prints
                </Button>
                <Button size="sm" onClick={() => setEditing(device)}>
                  <SlidersHorizontal className="size-4" />{" "}
                  {isReadOnly("devices") ? "View details" : "Configure"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 ? (
          <Card className="xl:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="mb-3 size-8 text-zinc-300" />
              <div className="text-sm font-medium text-zinc-500">
                No devices yet
              </div>
              <Button
                className="mt-3"
                disabled={isReadOnly("devices")}
                onClick={() => setCreating(true)}
              >
                <Plus className="size-4" /> Add device
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {creating ? (
        <BoothFormDialog
          title="Add device"
          initial={EMPTY_BOOTH}
          options={deviceFormOptions}
          submitting={createBooth.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => {
            createBooth.mutate(values, {
              onSuccess: () => {
                toast.success("Device created");
                setCreating(false);
              },
              onError: (err) =>
                toast.error(
                  err instanceof Error ? err.message : "Create failed",
                ),
            });
          }}
        />
      ) : null}
      {editing ? (
        <BoothFormDialog
          title={`Configure ${editing.name}`}
          initial={editing}
          options={deviceFormOptions}
          submitting={updateBooth.isPending}
          onClose={() => setEditing(null)}
          onDelete={() => {
            const target = editing;
            setEditing(null);
            handleDelete(target);
          }}
          onSubmit={(values) => {
            const {
              battery: _battery,
              appVersion: _appVersion,
              lastSync: _lastSync,
              ...editableValues
            } = values;
            void _battery;
            void _appVersion;
            void _lastSync;
            updateBooth.mutate(
              { id: editing.id, patch: editableValues },
              {
                onSuccess: () => {
                  toast.success("Device updated");
                  setEditing(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Update failed",
                  ),
              },
            );
          }}
        />
      ) : null}
      {failedFor ? (
        <FailedPrintsDialog
          device={failedFor}
          onClose={() => setFailedFor(null)}
        />
      ) : null}
    </div>
  );
}

function normalizeStringList(
  values?: string[] | null,
  fallback?: string | null,
) {
  const list = Array.isArray(values)
    ? values.map((value) => value.trim()).filter(Boolean)
    : [];
  if (list.length > 0) return Array.from(new Set(list));
  return fallback?.trim() ? [fallback.trim()] : [];
}

function formatAssignmentList(
  values?: string[] | null,
  fallback?: string | null,
) {
  const list = normalizeStringList(values, fallback);
  if (list.length === 0) return "—";
  if (list.length <= 2) return list.join(", ");
  return `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
}
