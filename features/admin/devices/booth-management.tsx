"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  AlertTriangle,
  Battery,
  CircleHelp,
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
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  useCreatePairedBooth,
  useDeleteBooth,
  useUpdateBooth,
  useValidateDevicePairing,
} from "@/features/admin/devices/use-devices";
import { useLayoutSchemas } from "@/features/admin/layout/use-layout";
import { usePricing } from "@/features/admin/pricing/use-pricing";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
import { useTemplates } from "@/features/admin/templates/use-templates";
import { cn } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import {
  FeatureGuidedTour,
  type FeatureTourStep,
} from "@/features/admin/tutorial/feature-guided-tour";
import { useFeatureTutorial } from "@/features/admin/tutorial/use-feature-tutorial";
import type {
  BoothInput,
  LayoutSchemaRow,
  PricingProduct,
  Template,
} from "@/features/admin/devices/api";
import type { Device } from "@/types/device";

import { BoothFormDialog } from "./_components/booth-form-dialog";
import { DeviceErrorsDialog } from "./_components/device-errors-dialog";
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
  voucherEnabled: false,
  testVoucherEnabled: false,
  protectSettings: false,
  settingsPin: "",
  printerBottomSafeZoneMm: 0,
  printerBrightness: 0,
  printerContrast: 0,
  printerDotDensity: 1,
};

const DEVICE_TOUR_STEPS: FeatureTourStep[] = [
  {
    selectors: ['[data-devices-tour="add-device"]'],
    title: "Pair perangkat baru",
    description:
      "Klik Add device lalu masukkan kode pairing yang muncul pada tablet setelah login. Kode hanya berlaku sementara.",
  },
  {
    selectors: ['[data-devices-tour="capacity"]'],
    title: "Pantau kapasitas",
    description:
      "Bagian ini menunjukkan jumlah device yang sudah digunakan dan sisa slot dari paket langganan organisasi.",
  },
  {
    selectors: [
      '[data-devices-tour="configure"]',
      '[data-devices-tour="device-list"]',
    ],
    title: "Konfigurasi setiap booth",
    description:
      "Setelah pairing, buka Configure untuk mengatur theme, frame, paket atau event, voucher, printer, dan keamanan settings.",
  },
];

const DEVICE_CONFIGURATION_TOUR_STEPS: FeatureTourStep[] = [
  {
    selectors: ['[data-device-config-tour="tabs"]'],
    title: "Tiga area konfigurasi",
    description:
      "General mengatur pengalaman pengunjung, Frame menentukan pilihan frame, dan System mengatur keamanan serta perangkat.",
  },
  {
    selectors: ['[data-device-config-tour="theme"]'],
    title: "Theme dan layout",
    description:
      "Pilih visual theme yang akan ditampilkan kiosk. Perubahan diterapkan saat device melakukan sync berikutnya.",
  },
  {
    selectors: ['[data-device-config-tour="session-access"]'],
    title: "Pricing atau event",
    description:
      "Pricing meminta pengunjung memilih paket dan membayar. Event langsung memulai sesi gratis untuk kiosk yang ditugaskan.",
  },
  {
    selectors: ['[data-device-config-tour="frames"]'],
    title: "Frame yang tersedia",
    description:
      "Pilih frame yang dapat digunakan pengunjung pada booth ini. Gunakan Select all bila seluruh koleksi ingin tersedia.",
  },
  {
    selectors: ['[data-device-config-tour="settings-pin"]'],
    title: "Keamanan settings kiosk",
    description:
      "Aktifkan PIN bila menu Settings tablet hanya boleh dibuka petugas. Reset dapat diminta melalui email owner dan admin.",
  },
  {
    selectors: ['[data-device-config-tour="save"]'],
    title: "Simpan konfigurasi",
    description:
      "Simpan setelah semua pengaturan selesai. Kiosk mengambil konfigurasi terbaru saat online dan melakukan sinkronisasi.",
  },
];

const DEVICE_CONFIGURATION_TOUR_START = DEVICE_TOUR_STEPS.length;
const DEVICE_TOUR_TAB_BY_STEP = [
  undefined,
  undefined,
  undefined,
  "general",
  "general",
  "general",
  "frame",
  "system",
  "system",
] as const;

type DeviceFormOptions = {
  themeOptions: Array<{ id: string; name: string }>;
  frameTemplates: Array<{
    id: string;
    name: string;
    frameImageUrl?: string;
    accentColor?: string;
    photoCount?: number;
  }>;
  pricingProducts: PricingProduct[];
};

export function BoothManagement({
  initialAction,
  initialDeviceId,
}: {
  initialAction?: string;
  initialDeviceId?: string;
}) {
  const { data = [], refetch, isLoading: devicesLoading } = useBooths();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } =
    useSubscriptionStatus();
  const { data: layouts = [] } = useLayoutSchemas();
  const { data: templates = [] } = useTemplates();
  const { isReadOnly } = usePermission();
  const { data: pricingProducts = [] } = usePricing();
  const createPairedBooth = useCreatePairedBooth();
  const updateBooth = useUpdateBooth();
  const deleteBooth = useDeleteBooth();
  const validatePairing = useValidateDevicePairing();
  const [editingId, setEditingId] = useState<string | null>(
    initialDeviceId ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [pairingDialogOpen, setPairingDialogOpen] = useState(
    initialAction === "create",
  );
  const [pairingCode, setPairingCode] = useState("");
  const [pairingId, setPairingId] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<Device | null>(null);
  const [errorsFor, setErrorsFor] = useState<Device | null>(null);
  const confirmDelete = useConfirmDialog();
  const devicesTutorial = useFeatureTutorial("devices");
  const [deviceTutorialStartStep, setDeviceTutorialStartStep] = useState(0);
  const [deviceTutorialTab, setDeviceTutorialTab] = useState<
    "general" | "frame" | "system" | undefined
  >(undefined);
  const deviceLimit = subscriptionStatus?.deviceLimit ?? 1;
  const usedDevices = data.length;
  const remainingDevices = Math.max(0, deviceLimit - usedDevices);
  const deviceUsagePercent =
    deviceLimit > 0 ? Math.min(100, (usedDevices / deviceLimit) * 100) : 0;
  const deviceLimitReached = remainingDevices <= 0;
  const editing = data.find((item) => item.id === editingId) ?? null;
  const deviceTourSteps =
    data.length > 0 || creating
      ? [...DEVICE_TOUR_STEPS, ...DEVICE_CONFIGURATION_TOUR_STEPS]
      : DEVICE_TOUR_STEPS;

  const startDeviceTutorial = (startStep = 0) => {
    setDeviceTutorialStartStep(startStep);
    setDeviceTutorialTab(DEVICE_TOUR_TAB_BY_STEP[startStep]);
    devicesTutorial.show();
  };

  const finishDeviceTutorial = () => {
    setDeviceTutorialTab(undefined);
    devicesTutorial.complete();
  };

  const handleDeviceTutorialStep = (nextStepIndex: number) => {
    setDeviceTutorialTab(DEVICE_TOUR_TAB_BY_STEP[nextStepIndex]);
    if (
      nextStepIndex >= DEVICE_CONFIGURATION_TOUR_START &&
      !editing &&
      !creating &&
      data[0]
    ) {
      setEditingId(data[0].id);
    }
  };

  const deviceFormOptions = useMemo<DeviceFormOptions>(
    () => ({
      themeOptions: layouts
        .filter((layout: LayoutSchemaRow) => Boolean(layout.name))
        .map((layout: LayoutSchemaRow) => ({
          id: layout.id,
          name: layout.name,
        })),
      frameTemplates: templates
        .filter((template: Template) => template.category === "frame")
        .filter((template: Template) => Boolean(template.name))
        .map((template: Template) => ({
          id: template.id,
          name: template.name,
          frameImageUrl: template.frameImageUrl,
          accentColor: template.accentColor,
          photoCount: template.photoCount,
        })),
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

  const openPairing = () => {
    setPairingCode("");
    setPairingId(null);
    setPairingDialogOpen(true);
  };

  const confirmPairingCode = () => {
    validatePairing.mutate(pairingCode, {
      onSuccess: ({ pairingId: nextPairingId }) => {
        setPairingId(nextPairingId);
        setPairingDialogOpen(false);
        setCreating(true);
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Pairing failed"),
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
            <Button variant="outline" onClick={() => startDeviceTutorial()}>
              <CircleHelp className="size-4" />
              Show tutorial
            </Button>
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
              data-devices-tour="add-device"
              onClick={openPairing}
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
      <Card data-devices-tour="capacity" className="mb-6">
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
      <div
        data-devices-tour="device-list"
        className="grid gap-4 xl:grid-cols-2"
      >
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
                  {formatPricingAssignments(
                    device.pricingProfiles,
                    pricingProducts,
                  )}
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
                    {formatFrameTemplateAssignments(
                      device.frameTemplates,
                      templates,
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Price:</span>
                  <span className="font-medium text-zinc-700">
                    {formatPricingAssignments(
                      device.pricingProfiles,
                      pricingProducts,
                    )}
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
                  variant={
                    device.unresolvedErrorCount ? "destructive" : "outline"
                  }
                  size="sm"
                  onClick={() => setErrorsFor(device)}
                >
                  <AlertTriangle className="size-4" />
                  Errors
                  {device.unresolvedErrorCount ? (
                    <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                      {device.unresolvedErrorCount}
                    </span>
                  ) : null}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFailedFor(device)}
                >
                  <Printer className="size-4" /> Failed prints
                </Button>
                <Button
                  data-devices-tour="configure"
                  size="sm"
                  onClick={() => setEditingId(device.id)}
                >
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
                onClick={openPairing}
              >
                <Plus className="size-4" /> Add device
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog
        open={pairingDialogOpen}
        onOpenChange={setPairingDialogOpen}
        title="Pair a new device"
        className="max-w-md"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            confirmPairingCode();
          }}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Enter the code shown on the tablet
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              A new kiosk shows an 8-character code after login. The code is
              valid for 10 minutes and this device remains locked until this
              configuration is saved.
            </p>
          </div>
          <Input
            autoFocus
            value={pairingCode}
            onChange={(event) =>
              setPairingCode(
                event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              )
            }
            placeholder="AB12CD34"
            maxLength={10}
            className="h-12 text-center font-mono text-lg font-semibold tracking-[0.2em]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPairingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pairingCode.length < 8 || validatePairing.isPending}
            >
              {validatePairing.isPending ? "Checking..." : "Continue"}
            </Button>
          </div>
        </form>
      </Dialog>

      {creating &&
      pairingId &&
      !devicesLoading &&
      !subscriptionLoading &&
      !deviceLimitReached &&
      !isReadOnly("devices") ? (
        <BoothFormDialog
          title="Configure paired device"
          initial={EMPTY_BOOTH}
          options={deviceFormOptions}
          submitting={createPairedBooth.isPending}
          onClose={() => {
            setCreating(false);
            setPairingId(null);
          }}
          onSubmit={(values) => {
            createPairedBooth.mutate(
              { pairingId, values },
              {
                onSuccess: () => {
                  toast.success("Device paired and configured");
                  setCreating(false);
                  setPairingId(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Pairing failed",
                  ),
              },
            );
          }}
          tutorialTab={deviceTutorialTab}
          onShowTutorial={() =>
            startDeviceTutorial(DEVICE_CONFIGURATION_TOUR_START)
          }
        />
      ) : null}
      {editing ? (
        <BoothFormDialog
          title={`Configure ${editing.name}`}
          initial={editing}
          options={deviceFormOptions}
          submitting={updateBooth.isPending}
          onClose={() => setEditingId(null)}
          onDelete={() => {
            const target = editing;
            setEditingId(null);
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
                  setEditingId(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Update failed",
                  ),
              },
            );
          }}
          tutorialTab={deviceTutorialTab}
          onShowTutorial={() =>
            startDeviceTutorial(DEVICE_CONFIGURATION_TOUR_START)
          }
        />
      ) : null}
      {failedFor ? (
        <FailedPrintsDialog
          device={failedFor}
          onClose={() => setFailedFor(null)}
        />
      ) : null}
      {errorsFor ? (
        <DeviceErrorsDialog
          device={errorsFor}
          canResolve={!isReadOnly("devices")}
          onClose={() => setErrorsFor(null)}
        />
      ) : null}
      {devicesTutorial.open ? (
        <FeatureGuidedTour
          key={deviceTutorialStartStep}
          open
          title="Device guide"
          steps={deviceTourSteps}
          initialStepIndex={deviceTutorialStartStep}
          onClose={finishDeviceTutorial}
          onComplete={finishDeviceTutorial}
          onBeforeStepChange={handleDeviceTutorialStep}
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

function formatFrameTemplateAssignments(
  values: string[] | null | undefined,
  templates: Template[],
) {
  const templateNames = new Map(
    templates.map((template) => [template.id, template.name]),
  );
  const resolved = normalizeStringList(values).map(
    (value) => templateNames.get(value) ?? value,
  );
  if (resolved.length === 0) return "—";
  if (resolved.length <= 2) return resolved.join(", ");
  return `${resolved.slice(0, 2).join(", ")} +${resolved.length - 2}`;
}

function formatPricingAssignments(
  values: string[] | null | undefined,
  pricingProducts: PricingProduct[],
) {
  const pricingNames = new Map(
    pricingProducts.map((product) => [product.id, product.name]),
  );
  const resolved = normalizeStringList(values).map(
    (value) => pricingNames.get(value) ?? value,
  );
  if (resolved.length === 0) return "—";
  if (resolved.length <= 2) return resolved.join(", ");
  return `${resolved.slice(0, 2).join(", ")} +${resolved.length - 2}`;
}
