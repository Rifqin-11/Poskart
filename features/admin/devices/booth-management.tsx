"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  AlertTriangle,
  Battery,
  CircleHelp,
  Layers3,
  MapPin,
  MonitorCog,
  Palette,
  Plus,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeviceStatusBadge } from "@/components/ui/device-status-badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  useFrameCategories,
  useTemplates,
} from "@/features/admin/templates/use-templates";
import { cn } from "@/lib/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { type DictionaryKey } from "@/lib/i18n/dictionaries";
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
import type { LayoutSchema } from "@/types/builder";
import type { Device } from "@/types/device";

import { BoothFormDialog } from "./_components/booth-form-dialog";
import { BoothLocationMap } from "./_components/booth-location-map";
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
  frameCategoriesEnabled: true,
  pricingProfiles: [],
  sessionCountdownSeconds: null,
  paymentCountdownSeconds: null,
  voucherEnabled: false,
  testVoucherEnabled: false,
  socialMediaConsentEnabled: true,
  emailDeliveryEnabled: true,
  protectSettings: false,
  settingsPin: "",
  printerBottomSafeZoneMm: 0,
  printerBrightness: 0,
  printerContrast: 0,
  printerDotDensity: 1,
};

function getDeviceTourSteps(t: (key: DictionaryKey) => string): FeatureTourStep[] {
  return [
    {
      selectors: ['[data-devices-tour="add-device"]'],
      title: t("devices.tourPairTitle"),
      description: t("devices.tourPairDesc"),
    },
    {
      selectors: ['[data-devices-tour="capacity"]'],
      title: t("devices.tourCapacityTitle"),
      description: t("devices.tourCapacityDesc"),
    },
    {
      selectors: [
        '[data-devices-tour="configure"]',
        '[data-devices-tour="device-list"]',
      ],
      title: t("devices.tourConfigTitle"),
      description: t("devices.tourConfigDesc"),
    },
  ];
}

function getDeviceConfigTourSteps(t: (key: DictionaryKey) => string): FeatureTourStep[] {
  return [
    {
      selectors: ['[data-device-config-tour="tabs"]'],
      title: t("devices.configTourTabsTitle"),
      description: t("devices.configTourTabsDesc"),
    },
    {
      selectors: ['[data-device-config-tour="theme"]'],
      title: t("devices.configTourThemeTitle"),
      description: t("devices.configTourThemeDesc"),
    },
    {
      selectors: ['[data-device-config-tour="session-access"]'],
      title: t("devices.configTourAccessTitle"),
      description: t("devices.configTourAccessDesc"),
    },
    {
      selectors: ['[data-device-config-tour="frames"]'],
      title: t("devices.configTourFramesTitle"),
      description: t("devices.configTourFramesDesc"),
    },
    {
      selectors: ['[data-device-config-tour="settings-pin"]'],
      title: t("devices.configTourSecurityTitle"),
      description: t("devices.configTourSecurityDesc"),
    },
    {
      selectors: ['[data-device-config-tour="save"]'],
      title: t("devices.configTourSaveTitle"),
      description: t("devices.configTourSaveDesc"),
    },
  ];
}

const DEVICE_CONFIGURATION_TOUR_START = 3; // DEVICE_TOUR_STEPS has 3 steps
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
  themeOptions: Array<{
    id: string;
    name: string;
    schema?: LayoutSchema;
    status?: string;
    isActive?: boolean;
  }>;
  frameTemplates: Array<{
    id: string;
    name: string;
    frameImageUrl?: string;
    accentColor?: string;
    photoCount?: number;
    printLengthMm?: number;
    frameCategoryId?: string;
  }>;
  frameCategories: Array<{
    id: string;
    name: string;
    displayOrder: number;
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
  const { data: frameCategories = [] } = useFrameCategories();
  const { isReadOnly } = usePermission();
  const { t } = useI18n();
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
  const [createdDeviceId, setCreatedDeviceId] = useState<string | null>(null);
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
  const DEVICE_TOUR_STEPS = getDeviceTourSteps(t);
  const DEVICE_CONFIGURATION_TOUR_STEPS = getDeviceConfigTourSteps(t);
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
          schema: layout.schema,
          status: layout.status,
          isActive: layout.is_active,
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
          printLengthMm: template.printLengthMm,
          frameCategoryId: template.frameCategoryId,
        })),
      frameCategories,
      pricingProducts,
    }),
    [frameCategories, layouts, pricingProducts, templates],
  );

  const handleDelete = (device: Device) => {
    confirmDelete.confirm({
      title: t("devices.deleteTitle"),
      description: t("devices.deleteDesc").replace("{name}", device.name),
      confirmLabel: t("devices.deleteConfirm"),
      destructive: true,
      onConfirm: () => {
        deleteBooth.mutate(device.id, {
          onSuccess: () => toast.success(t("devices.deleteSuccess")),
          onError: (err) =>
            toast.error(
              getUserFacingErrorMessage(err, t("devices.deleteFailed")),
            ),
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
      onSuccess: ({ pairingId: nextPairingId, deviceId }) => {
        setPairingId(nextPairingId);
        setCreatedDeviceId(deviceId);
        setPairingDialogOpen(false);
        setCreating(true);
      },
      onError: (error) =>
        toast.error(
          getUserFacingErrorMessage(error, t("devices.pairingFailed")),
        ),
    });
  };

  return (
    <div className="min-w-0">
      {confirmDelete.dialog}
      <PageHeader
        title={t("devices.pageTitle")}
        description={t("devices.pageDesc")}
        action={
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button variant="outline" onClick={() => startDeviceTutorial()}>
              <CircleHelp className="size-4" />
              {t("devices.showTutorial")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void refetch();
                toast.message("Refreshing network…");
              }}
            >
              <RefreshCw className="size-4" /> {t("devices.refreshNetwork")}
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
              <Plus className="size-4" /> {t("devices.addDevice")}
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
          <div className="grid min-w-0 grid-cols-3 gap-2 text-center">
            <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-3 sm:px-4">
              <div className="text-lg font-semibold text-zinc-950">
                {usedDevices}
              </div>
              <div className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Used
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-3 sm:px-4">
              <div className="text-lg font-semibold text-zinc-950">
                {deviceLimit}
              </div>
              <div className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Allowed
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-3 sm:px-4">
              <div
                className={cn(
                  "text-lg font-semibold",
                  deviceLimitReached ? "text-red-600" : "text-emerald-700",
                )}
              >
                {remainingDevices}
              </div>
              <div className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div
        data-devices-tour="device-list"
        className="grid min-w-0 gap-4 xl:grid-cols-2"
      >
        {data.map((device: Device) => {
          const paperInitialLengthMm = device.paperInitialLengthMm ?? 0;
          const paperRemainingLengthMm = Math.max(
            0,
            paperInitialLengthMm - (device.paperUsedLengthMm ?? 0),
          );
          const paperRemainingPercent = paperInitialLengthMm > 0
            ? (paperRemainingLengthMm / paperInitialLengthMm) * 100
            : 0;
          const activeFrame = templates.find(
            (template) => template.id === device.template,
          );
          const paperPrintsRemaining = Math.floor(
            paperRemainingLengthMm /
              ((activeFrame?.printLengthMm ?? 150) +
                device.printerBottomSafeZoneMm),
          );
          return (
          <Card
            key={device.id}
            className="group min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white transition-shadow duration-200 hover:shadow-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#00357B] text-white">
                  <MonitorCog className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {device.name}
                  </p>
                  <p className="truncate text-[11px] text-zinc-400">
                    <span className="font-mono">{device.id}</span>
                    <span className="mx-1.5 text-zinc-300">·</span>
                    <span>v{device.appVersion || "—"}</span>
                  </p>
                </div>
              </div>

              <DeviceStatusBadge
                status={device.status}
                className="h-6 rounded-lg px-2 text-[11px]"
              />
            </div>

            <CardContent className="min-w-0 space-y-3 p-4">
              {/* Battery, paper estimate, and printer row */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {/* Battery */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Battery className="size-3.5" />
                      {t("devices.battery")}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        device.battery <= 20 ? "text-red-600" : "text-zinc-800",
                      )}
                    >
                      {device.battery}%
                    </span>
                  </div>
                  <Progress
                    value={device.battery}
                    className={cn(
                      "mt-2 h-1 bg-zinc-200 [&>div]:rounded-full [&>div]:bg-[#00357B]",
                      device.battery <= 20 && "[&>div]:bg-red-500",
                    )}
                  />
                  <p className="mt-1.5 truncate text-[10px] text-zinc-400">
                    {device.lastSync}
                  </p>
                </div>

                {/* Estimated paper */}
                {paperInitialLengthMm > 0 ? (
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-400">
                        Estimated paper
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          paperRemainingPercent < 5
                            ? "text-red-600"
                            : paperRemainingPercent < 20
                              ? "text-amber-600"
                              : "text-zinc-800",
                        )}
                      >
                        {paperRemainingPercent.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={paperRemainingPercent}
                      className={cn(
                        "mt-2 h-1 bg-zinc-200 [&>div]:rounded-full [&>div]:bg-emerald-500",
                        paperRemainingPercent < 20 &&
                          "[&>div]:bg-amber-500",
                        paperRemainingPercent < 5 && "[&>div]:bg-red-500",
                      )}
                    />
                    <p className="mt-1.5 truncate text-[10px] text-zinc-400">
                      ~{(paperRemainingLengthMm / 1000).toFixed(1)} m · ~
                      {paperPrintsRemaining} prints
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-2.5 text-[11px] text-zinc-400">
                    Paper roll belum dikonfigurasi.
                  </div>
                )}

                {/* Printer */}
                <div
                  className={cn(
                    "rounded-xl border p-3",
                    device.printerStatus === "ready"
                      ? "border-emerald-100 bg-emerald-50/40"
                      : device.printerStatus === "unknown"
                        ? "border-zinc-100 bg-zinc-50/60"
                        : "border-red-100 bg-red-50/40",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Printer
                      className={cn(
                        "size-3.5",
                        device.printerStatus === "ready"
                          ? "text-emerald-600"
                          : device.printerStatus === "unknown"
                            ? "text-zinc-400"
                            : "text-red-600",
                      )}
                    />
                    <span className="text-[11px] text-zinc-400">Printer</span>
                  </div>
                  <p className="mt-1.5 truncate text-xs font-semibold text-zinc-800">
                    {device.printerName || t("devices.notSet")}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] capitalize",
                      device.printerStatus === "ready"
                        ? "text-emerald-600"
                        : device.printerStatus === "unknown"
                          ? "text-zinc-400"
                          : "text-red-600",
                    )}
                  >
                    {device.printerStatus ?? "unknown"}
                  </p>
                </div>
              </div>

              {/* Location + Map */}
              <div className="overflow-hidden rounded-xl border border-zinc-100">
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-zinc-400" />
                    <p className="truncate text-xs font-medium text-zinc-700">
                      {device.location || "Location not set"}
                    </p>
                  </div>
                  {device.location ? (
                    <a
                      href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(device.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#00357B] hover:underline"
                    >
                      Open <ArrowUpRight className="size-3" />
                    </a>
                  ) : null}
                </div>
                <BoothLocationMap
                  location={device.location}
                  className="h-32 border-t border-zinc-100"
                />
              </div>

              {/* Active setup */}
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-3.5 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Active Setup
                </p>
                <div className="grid gap-x-3 gap-y-2 sm:grid-cols-3">
                  <div>
                    <p className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <Palette className="size-3" /> Theme
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-zinc-700">
                      {device.theme || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <Layers3 className="size-3" /> Frames
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-4 text-zinc-700">
                      {formatFrameTemplateAssignments(
                        device.frameTemplates,
                        templates,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <Store className="size-3" /> Pricing
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-4 text-zinc-700">
                      {formatPricingAssignments(
                        device.pricingProfiles,
                        pricingProducts,
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-zinc-200/60 px-2 py-0.5 text-[10px] text-zinc-500">
                    Session {device.sessionCountdownSeconds ? `${device.sessionCountdownSeconds}s` : "default"}
                  </span>
                  <span className="rounded-md bg-zinc-200/60 px-2 py-0.5 text-[10px] text-zinc-500">
                    Payment {device.paymentCountdownSeconds ? `${device.paymentCountdownSeconds}s` : "default"}
                  </span>
                  {device.voucherEnabled ? (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Voucher on
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 w-full rounded-lg px-3 text-xs sm:w-auto",
                      device.unresolvedErrorCount
                        ? "border-red-200 text-red-700 hover:bg-red-50"
                        : "",
                    )}
                    onClick={() => setErrorsFor(device)}
                  >
                    <AlertTriangle className="size-3.5" />
                    Errors
                    {device.unresolvedErrorCount ? (
                      <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                        {device.unresolvedErrorCount}
                      </span>
                    ) : null}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full rounded-lg px-3 text-xs sm:w-auto"
                    onClick={() => setFailedFor(device)}
                  >
                    <Printer className="size-3.5" /> Prints
                  </Button>
                </div>
                <Button
                  data-devices-tour="configure"
                  size="sm"
                  className="h-8 w-full rounded-lg bg-[#00357B] px-4 text-xs hover:bg-[#014EB4] sm:w-auto"
                  onClick={() => setEditingId(device.id)}
                >
                  <SlidersHorizontal className="size-3.5" />{" "}
                  {isReadOnly("devices") ? "View" : "Configure"}
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
        {data.length === 0 ? (
          <Card className="xl:col-span-2">
            <CardContent className="py-10">
              <div className="mx-auto max-w-md">
                <p className="mb-6 text-center text-sm font-semibold text-zinc-950">
                  Pasangkan device kiosk pertama Anda
                </p>
                <div className="space-y-3">
                  {[
                    { step: "1", label: "Install aplikasi", desc: "Unduh POSKART Kiosk di tablet Android Anda." },
                    { step: "2", label: "Login di tablet", desc: "Masuk menggunakan akun yang terdaftar di organisasi ini." },
                    { step: "3", label: "Salin kode dari tablet", desc: "Kode 8 karakter muncul otomatis di layar setelah login. Kode berlaku 10 menit." },
                    { step: "4", label: "Masukkan kode di sini", desc: "Klik \"Add device\" lalu ketik kode dari tablet.", action: true },
                  ].map(({ step, label, desc, action }) => (
                    <div key={step} className="flex gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                        {step}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-950">{label}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
                        {step === "1" ? (
                          <Link
                            href="/download"
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({
                              size: "sm",
                              variant: "outline",
                              className: "mt-2 text-[#00357B]",
                            })}
                          >
                            Download aplikasi
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        ) : null}
                        {action && (
                          <Button
                            size="sm"
                            className="mt-2"
                            disabled={isReadOnly("devices")}
                            onClick={openPairing}
                          >
                            <Plus className="size-3.5" /> Add device
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog
        open={pairingDialogOpen}
        onOpenChange={setPairingDialogOpen}
        title="Pasangkan device kiosk"
        className="max-w-md"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            confirmPairingCode();
          }}
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <p className="font-medium text-zinc-950">Kode berasal dari tablet, bukan dari sini.</p>
              <ol className="mt-2 space-y-1 text-xs leading-5">
                <li>1. Buka aplikasi POSKART Kiosk di tablet</li>
                <li>2. Pilih Login dengan code</li>
                <li>3. Kode 8 karakter muncul otomatis di layar tablet</li>
                <li>4. Ketik kode tersebut di bawah — berlaku 10 menit</li>
              </ol>
            </div>
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
      createdDeviceId &&
      !devicesLoading &&
      !subscriptionLoading &&
      !deviceLimitReached &&
      !isReadOnly("devices") ? (
        <BoothFormDialog
          title="Configure new device"
          initial={EMPTY_BOOTH}
          options={deviceFormOptions}
          submitting={updateBooth.isPending}
          onClose={() => {
            setCreating(false);
            setPairingId(null);
            setCreatedDeviceId(null);
          }}
          onSubmit={(values) => {
            updateBooth.mutate(
              { id: createdDeviceId!, patch: values },
              {
                onSuccess: () => {
                  toast.success("Device configured");
                  setCreating(false);
                  setPairingId(null);
                  setCreatedDeviceId(null);
                },
                onError: (err) =>
                  toast.error(
                    getUserFacingErrorMessage(
                      err,
                      "Konfigurasi device gagal. Coba lagi.",
                    ),
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
              status: submittedStatus,
              ...editableValues
            } = values;
            void _battery;
            void _appVersion;
            void _lastSync;
            const statusPatch =
              submittedStatus === "maintenance" ||
              editing.status === "maintenance"
                ? { status: submittedStatus }
                : {};
            updateBooth.mutate(
              {
                id: editing.id,
                patch: { ...editableValues, ...statusPatch },
              },
              {
                onSuccess: () => {
                  toast.success("Device updated");
                  setEditingId(null);
                },
                onError: (err) =>
                  toast.error(
                    getUserFacingErrorMessage(
                      err,
                      "Device tidak dapat diperbarui. Coba lagi.",
                    ),
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
          canSendToDeveloper={!isReadOnly("devices")}
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
