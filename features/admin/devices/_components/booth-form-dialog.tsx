"use client";

import { useState } from "react";
import {
  Check,
  CircleHelp,
  CreditCard,
  GalleryVerticalEnd,
  ImageIcon,
  Layers3,
  Loader2,
  Mail,
  MonitorCog,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Timer,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BoothInput, PricingProduct } from "@/features/admin/devices/api";
import { ThemeThumbnail } from "@/features/admin/themes/theme-thumbnail";
import { PRINTER_TUNING_LIMITS } from "@/lib/printer-tuning";
import { cn } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type { LayoutSchema } from "@/types/builder";
import type { Device } from "@/types/device";

type DeviceFormOptions = {
  themeOptions: ThemeOption[];
  frameTemplates: FrameTemplateOption[];
  frameCategories: FrameCategoryOption[];
  pricingProducts: PricingProduct[];
};

type ThemeOption = {
  id: string;
  name: string;
  schema?: LayoutSchema;
  status?: string;
  isActive?: boolean;
};

type FrameTemplateOption = {
  id: string;
  name: string;
  frameImageUrl?: string;
  accentColor?: string;
  photoCount?: number;
  printLengthMm?: number;
  frameCategoryId?: string;
};

type FrameCategoryOption = {
  id: string;
  name: string;
  displayOrder: number;
};

type SessionAccessMode = "" | "paid" | "event";
type DeviceConfigurationTab = "general" | "frame" | "system";

const ALL_FRAME_CATEGORY_ID = "__all__";
const GENERAL_FRAME_CATEGORY_ID = "__general__";

const CUSTOM_PAPER_THICKNESS_MM = 0.065;
const BLUEPRINT_OIL_RESISTANT_ROLL_LENGTHS_MM = {
  "80x40": 16010,
  "80x80": 60190,
} as const;

function estimatedLengthFromRollDiametersMm(
  outerDiameterMm: number,
  coreDiameterMm: number,
) {
  if (outerDiameterMm <= coreDiameterMm || coreDiameterMm <= 0) return 0;
  return Math.round(
    (Math.PI * (outerDiameterMm ** 2 - coreDiameterMm ** 2)) /
      (4 * CUSTOM_PAPER_THICKNESS_MM),
  );
}

type BoothFormDialogProps = {
  title: string;
  initial: BoothInput | Device;
  options: DeviceFormOptions;
  submitting: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (values: BoothInput) => void;
  tutorialTab?: DeviceConfigurationTab;
  onShowTutorial?: () => void;
};

export function BoothFormDialog({
  title,
  initial,
  options,
  submitting,
  onClose,
  onDelete,
  onSubmit,
  tutorialTab,
  onShowTutorial,
}: BoothFormDialogProps) {
  const { isReadOnly } = usePermission();
  const readOnly = isReadOnly("devices");
  const initialDevice = initial as Partial<Device>;
  const initialPricingAssignments = normalizeStringList(
    initialDevice.pricingProfiles,
    initialDevice.pricingProfile,
  );
  const paidProducts = options.pricingProducts.filter(
    (product) => product.active && product.accessMode === "paid",
  );
  const eventProducts = options.pricingProducts.filter(
    (product) => product.accessMode === "event",
  );
  const initialEventProduct = findAssignedProduct(
    eventProducts,
    initialPricingAssignments,
  );
  const initialPaidSelections = initialPricingAssignments
    .filter(
      (assignment) =>
        assignment !== initialEventProduct?.id &&
        assignment !== initialEventProduct?.name,
    )
    .map(
      (assignment) =>
        findAssignedProduct(paidProducts, [assignment])?.id ?? assignment,
    );
  const defaultPaidSelections = initialPaidSelections;
  const [sessionMode, setSessionMode] = useState<SessionAccessMode>(
    initialEventProduct
      ? "event"
      : initialPaidSelections.length > 0
        ? "paid"
        : "",
  );
  const [paidSelections, setPaidSelections] = useState(defaultPaidSelections);
  const [eventSelection, setEventSelection] = useState(
    initialEventProduct?.id ?? "",
  );
  const [activeTab, setActiveTab] = useState<DeviceConfigurationTab>("general");
  const [frameSearch, setFrameSearch] = useState("");
  const [activeFrameCategoryId, setActiveFrameCategoryId] = useState(
    ALL_FRAME_CATEGORY_ID,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<BoothInput>(() => {
    const { id: _ignored, ...rest } = initial as Device;
    void _ignored;
    const pricingProfiles = initialEventProduct
      ? [initialEventProduct.id]
      : defaultPaidSelections;
    return {
      ...rest,
      layoutSchemaId: normalizeLayoutSchemaAssignment(
        rest.layoutSchemaId,
        rest.theme,
        options.themeOptions,
      ),
      frameTemplates: normalizeFrameTemplateAssignments(
        rest.frameTemplates,
        rest.template,
        options.frameTemplates,
      ),
      pricingProfile: pricingProfiles[0] ?? "",
      pricingProfiles,
      settingsPin: "",
    } as BoothInput;
  });

  const deviceInitial = initial as Partial<Device>;
  const printerStatus = deviceInitial.printerStatus ?? "unknown";
  const printerConnected = printerStatus === "ready";
  const runtimeStatus = form.status;
  const maintenanceEnabled = runtimeStatus === "maintenance";
  const frameTemplateOptions = includeCurrentOptions(
    options.frameTemplates.map((template) => template.id),
    form.frameTemplates,
  );
  const frameTemplateSelectionOptions = frameTemplateOptions.map(
    (id): FrameTemplateOption =>
      options.frameTemplates.find((template) => template.id === id) ?? {
        id,
        name: id,
      },
  );
  const selectedFrameCategoryIds = new Set(
    frameTemplateSelectionOptions
      .map((template) => template.frameCategoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId)),
  );
  const availableFrameCategories = options.frameCategories
    .filter((category) => selectedFrameCategoryIds.has(category.id))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const hasGeneralFrameTemplates = frameTemplateSelectionOptions.some(
    (template) => !template.frameCategoryId,
  );
  const showFrameCategoryTabs =
    availableFrameCategories.length > 0 || hasGeneralFrameTemplates;
  const effectiveFrameCategoryId =
    activeFrameCategoryId === GENERAL_FRAME_CATEGORY_ID &&
    hasGeneralFrameTemplates
      ? activeFrameCategoryId
      : activeFrameCategoryId === ALL_FRAME_CATEGORY_ID ||
          availableFrameCategories.some(
            (category) => category.id === activeFrameCategoryId,
          )
        ? activeFrameCategoryId
        : ALL_FRAME_CATEGORY_ID;
  const categoryFilteredFrameTemplates =
    effectiveFrameCategoryId === ALL_FRAME_CATEGORY_ID
      ? frameTemplateSelectionOptions
      : effectiveFrameCategoryId === GENERAL_FRAME_CATEGORY_ID
        ? frameTemplateSelectionOptions.filter(
            (template) => !template.frameCategoryId,
          )
        : frameTemplateSelectionOptions.filter(
            (template) =>
              template.frameCategoryId === effectiveFrameCategoryId,
          );
  const frameCategoryTabs = [
    {
      id: ALL_FRAME_CATEGORY_ID,
      label: "All",
      count: frameTemplateSelectionOptions.length,
    },
    ...(hasGeneralFrameTemplates
      ? [
          {
            id: GENERAL_FRAME_CATEGORY_ID,
            label: "General",
            count: frameTemplateSelectionOptions.filter(
              (template) => !template.frameCategoryId,
            ).length,
          },
        ]
      : []),
    ...availableFrameCategories.map((category) => ({
      id: category.id,
      label: category.name,
      count: frameTemplateSelectionOptions.filter(
        (template) => template.frameCategoryId === category.id,
      ).length,
    })),
  ];
  const allFramesSelected =
    frameTemplateOptions.length > 0 &&
    frameTemplateOptions.every((template) =>
      form.frameTemplates.includes(template),
    );
  const visibleFrameTemplates = categoryFilteredFrameTemplates.filter(
    (template) =>
      template.name
        .toLocaleLowerCase()
        .includes(frameSearch.trim().toLocaleLowerCase()),
  );
  const paperInitialLengthMm = form.paperInitialLengthMm ?? 0;
  const paperUsedLengthMm = form.paperUsedLengthMm ?? 0;
  const paperRemainingLengthMm = Math.max(0, paperInitialLengthMm - paperUsedLengthMm);
  const paperRemainingPercent = paperInitialLengthMm > 0
    ? Math.min(100, (paperRemainingLengthMm / paperInitialLengthMm) * 100)
    : 0;
  const activePaperTemplate = frameTemplateSelectionOptions.find(
    (template) => template.id === form.template,
  ) ?? frameTemplateSelectionOptions[0];
  const paperPerPrintMm = (activePaperTemplate?.printLengthMm ?? 150) +
    (form.printerBottomSafeZoneMm ?? 0);
  const paperPrintsRemaining = paperPerPrintMm > 0
    ? Math.floor(paperRemainingLengthMm / paperPerPrintMm)
    : 0;
  const isCustomPaperRoll = form.paperRollType === "custom";

  const selectSessionMode = (mode: SessionAccessMode) => {
    setSessionMode(mode);
    const selections =
      mode === "paid"
        ? paidSelections
        : eventSelection
          ? [eventSelection]
          : [];
    setForm({
      ...form,
      pricingProfile: selections[0] ?? "",
      pricingProfiles: selections,
    });
  };

  const showFormError = (message: string, tab: DeviceConfigurationTab) => {
    setFormError(message);
    setActiveTab(tab);
    toast.error(message);
  };

  const toggleAllFrames = () => {
    const frameTemplates = allFramesSelected ? [] : frameTemplateOptions;
    setForm({
      ...form,
      frameTemplates,
      template: frameTemplates[0] ?? "",
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={title}
      className="max-w-6xl rounded-[2rem] border-white/80 shadow-[0_32px_100px_rgba(0,35,82,0.24)]"
      overlayClassName="bg-[#061a33]/45"
      headerAction={
        onShowTutorial ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShowTutorial}
          >
            <CircleHelp className="size-4" />
            <span className="hidden sm:inline">Show tutorial</span>
          </Button>
        ) : null
      }
    >
      <form
        className="-m-4 sm:-m-5"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError(null);
          if (!form.name.trim() || !form.location.trim()) {
            showFormError("Name and location are required", "general");
            return;
          }
          if (!sessionMode) {
            showFormError("Choose Pricing or Event access", "general");
            return;
          }
          if (form.pricingProfiles.length === 0) {
            showFormError(
              sessionMode === "event"
                ? "Choose one active event"
                : "Choose at least one paid package",
              "general",
            );
            return;
          }
          if (
            form.protectSettings &&
            !form.settingsPin?.trim() &&
            !initialDevice.protectSettings
          ) {
            showFormError(
              "Set a 4 to 12 digit Settings PIN before enabling protection",
              "system",
            );
            return;
          }
          if (
            form.settingsPin?.trim() &&
            !/^\d{4,12}$/.test(form.settingsPin.trim())
          ) {
            showFormError(
              "Settings PIN must contain 4 to 12 digits",
              "system",
            );
            return;
          }
          if (
            sessionMode === "event" &&
            !eventProducts.some(
              (product) =>
                (product.id === eventSelection ||
                  product.name === eventSelection) &&
                product.active &&
                !isEventExpired(product),
            )
          ) {
            showFormError(
              "The selected event is inactive or expired",
              "general",
            );
            return;
          }
          onSubmit(form);
        }}
      >
        <Tabs
          defaultValue="general"
          value={tutorialTab ?? activeTab}
          onValueChange={(value) =>
            setActiveTab(value as DeviceConfigurationTab)
          }
          className="w-full px-4 pb-24 pt-4 sm:px-6 sm:pt-5"
        >
          <TabsList
            data-device-config-tour="tabs"
            className="sticky top-0 z-20 -mx-1 grid h-auto w-[calc(100%+0.5rem)] grid-cols-3 gap-1.5 rounded-[1.35rem] border border-zinc-300 bg-zinc-100/95 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-xl"
          >
            <TabsTrigger
              value="general"
              className="h-auto min-w-0 rounded-2xl border border-zinc-200/90 px-2 py-2.5 sm:justify-start sm:px-4"
            >
              <Sparkles className="size-4 shrink-0" />
              <span className="ml-2 min-w-0 text-left">
                <span className="block font-semibold text-zinc-900">General</span>
                <span className="hidden truncate text-[10px] font-normal text-zinc-400 sm:block">
                  Identity & access
                </span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="frame"
              className="h-auto min-w-0 rounded-2xl border border-zinc-200/90 px-2 py-2.5 sm:justify-start sm:px-4"
            >
              <GalleryVerticalEnd className="size-4 shrink-0" />
              <span className="ml-2 min-w-0 text-left">
                <span className="block font-semibold text-zinc-900">Frames</span>
                <span className="hidden truncate text-[10px] font-normal text-zinc-400 sm:block">
                  {form.frameTemplates.length} selected
                </span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="h-auto min-w-0 rounded-2xl border border-zinc-200/90 px-2 py-2.5 sm:justify-start sm:px-4"
            >
              <Wrench className="size-4 shrink-0" />
              <span className="ml-2 min-w-0 text-left">
                <span className="block font-semibold text-zinc-900">System</span>
                <span className="hidden truncate text-[10px] font-normal text-zinc-400 sm:block">
                  Security & hardware
                </span>
              </span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GENERAL */}
          <TabsContent
            value="general"
            className="min-h-[340px] space-y-5"
          >
            <section className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white">
              <div className="flex items-start gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-4 sm:px-5">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                  <MonitorCog className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Booth identity</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Name this kiosk clearly so operators can identify it from the dashboard.
                  </p>
                </div>
              </div>
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-zinc-600">
                    Booth name
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Device 01"
                      disabled={readOnly}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">
                    Location
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      placeholder="PVJ Bandung"
                      disabled={readOnly}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f4f7ff] p-2.5">
                  <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      App version
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-zinc-800">
                      {form.appVersion || "Not synced"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      Last sync
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-zinc-800">
                      {form.lastSync || "Not synced"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section
                data-device-config-tour="theme"
                className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                    <Layers3 className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Theme / layout
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Choose the visual layout shown on this kiosk.
                    </p>
                  </div>
                </div>
                <ThemePicker
                  className="mt-4"
                  value={form.layoutSchemaId ?? ""}
                  options={includeCurrentThemeOptions(
                    options.themeOptions,
                    form.layoutSchemaId,
                    form.theme,
                  )}
                  disabled={readOnly}
                  onChange={(value) => {
                    const layout = options.themeOptions.find(
                      (option) => option.id === value,
                    );
                    setForm({
                      ...form,
                      layoutSchemaId: value || null,
                      theme: layout?.name ?? "",
                    });
                  }}
                />
              </section>

              <section
                data-device-config-tour="session-access"
                className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                      <CreditCard className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Session access
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Choose one simple flow for visitors on this device.
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {sessionMode === "event"
                      ? "Event"
                      : sessionMode === "paid"
                        ? "Pricing"
                        : "Not selected"}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <SessionModeButton
                    title="Pricing"
                    description="Paid packages and QRIS"
                    icon={CreditCard}
                    selected={sessionMode === "paid"}
                    disabled={readOnly || paidProducts.length === 0}
                    onClick={() => selectSessionMode("paid")}
                  />
                  <SessionModeButton
                    title="Event"
                    description="Direct event access"
                    icon={TicketCheck}
                    selected={sessionMode === "event"}
                    disabled={
                      readOnly ||
                      (!initialEventProduct &&
                        !eventProducts.some(
                          (product) => product.active && !isEventExpired(product),
                        ))
                    }
                    onClick={() => selectSessionMode("event")}
                  />
                </div>

                {sessionMode === "paid" ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-zinc-600">
                      Available packages
                    </p>
                    <DeviceMultiSelect
                      values={paidSelections}
                      emptyLabel="No active paid packages yet"
                      options={includeCurrentOptions(
                        paidProducts.map((product) => product.id),
                        paidSelections,
                      ).map((id) => ({
                        value: id,
                        label:
                          paidProducts.find((product) => product.id === id)
                            ?.name ?? id,
                      }))}
                      disabled={readOnly}
                      onChange={(values) => {
                        setPaidSelections(values);
                        setForm({
                          ...form,
                          pricingProfile: values[0] ?? "",
                          pricingProfiles: values,
                        });
                      }}
                    />
                  </div>
                ) : sessionMode === "event" ? (
                  <EventProductSelect
                    className="mt-3"
                    value={eventSelection}
                    products={eventProducts}
                    disabled={readOnly}
                    onChange={(value) => {
                      setEventSelection(value);
                      setForm({
                        ...form,
                        pricingProfile: value,
                        pricingProfiles: value ? [value] : [],
                      });
                    }}
                  />
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-4 text-xs text-zinc-500">
                    Select a session type to configure visitor access.
                  </p>
                )}
              </section>
            </div>

            <section
              className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                  <TicketCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Payment methods
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Control voucher payment availability for this device.
                    Changes apply after the kiosk&apos;s next sync.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Voucher</p>
                    <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                      Show the voucher entry option alongside QRIS.
                    </p>
                  </div>
                  <Switch
                    checked={form.voucherEnabled ?? false}
                    disabled={readOnly}
                    onCheckedChange={(voucherEnabled) =>
                      setForm({
                        ...form,
                        voucherEnabled,
                        testVoucherEnabled: voucherEnabled
                          ? form.testVoucherEnabled
                          : false,
                      })
                    }
                    aria-label="Toggle voucher payment"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      Test voucher
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                      Enable code{" "}
                      <span className="font-mono font-medium">TEST</span> for
                      local test sessions. It is excluded from transactions,
                      dashboard, and payout.
                    </p>
                  </div>
                  <Switch
                    checked={form.testVoucherEnabled ?? false}
                    disabled={readOnly || !form.voucherEnabled}
                    onCheckedChange={(testVoucherEnabled) =>
                      setForm({ ...form, testVoucherEnabled })
                    }
                    aria-label="Toggle test voucher"
                  />
                </div>
              </div>
            </section>

            <section
              data-device-config-tour="visitor-experience"
              className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                  <Users className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Visitor experience
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Control conditional steps and delivery channels for this
                    device. The same switches remain available in Flutter and
                    the latest saved value is synchronized.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#00357B]">
                      <Users className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        Social media consent
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                        Ask every visitor for publication consent after the
                        Camera page.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.socialMediaConsentEnabled ?? true}
                    disabled={readOnly}
                    onCheckedChange={(socialMediaConsentEnabled) =>
                      setForm({ ...form, socialMediaConsentEnabled })
                    }
                    aria-label="Toggle social media consent"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#00357B]">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        Email delivery
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                        Allow Email when softfile delivery and at least one
                        upload option are enabled on the kiosk.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.emailDeliveryEnabled ?? true}
                    disabled={readOnly}
                    onCheckedChange={(emailDeliveryEnabled) =>
                      setForm({ ...form, emailDeliveryEnabled })
                    }
                    aria-label="Toggle email delivery"
                  />
                </div>
              </div>
            </section>
          </TabsContent>

          {/* TAB 2: FRAME */}
          <TabsContent value="frame" className="min-h-[340px]">
            <section
              data-device-config-tour="frames"
              className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60"
            >
              <div className="flex flex-col gap-4 border-b border-zinc-200 bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00357B] text-white shadow-md shadow-blue-950/10">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Frame templates
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Choose the collection visitors can browse on this booth.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Badge className="h-9 justify-center rounded-xl border-blue-100 bg-blue-50 px-3 text-[#00357B]">
                    {form.frameTemplates.length} selected
                  </Badge>
                  <div className="relative min-w-0 sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={frameSearch}
                      className="h-9 rounded-xl bg-zinc-50 pl-9"
                      placeholder="Search frames"
                      onChange={(event) => setFrameSearch(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={readOnly || frameTemplateOptions.length === 0}
                    onClick={toggleAllFrames}
                  >
                    {allFramesSelected ? "Clear all" : "Select all"}
                  </Button>
                </div>
              </div>
              <div className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-[#f4f7ff] p-4 sm:mx-5 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-blue-100">
                    <Layers3 className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-900">
                      Frame categories
                    </h4>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                      Show the Semua, General, and assigned category tabs above
                      the frame picker on this booth. When disabled, every
                      selected frame stays available in one grid.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-blue-100">
                  <span className="text-xs font-semibold text-zinc-600">
                    {(form.frameCategoriesEnabled ?? true) ? "Visible" : "Hidden"}
                  </span>
                  <Switch
                    checked={form.frameCategoriesEnabled ?? true}
                    disabled={readOnly}
                    onCheckedChange={(frameCategoriesEnabled) =>
                      setForm({ ...form, frameCategoriesEnabled })
                    }
                    aria-label="Enable frame categories on kiosk"
                  />
                </div>
              </div>
              {showFrameCategoryTabs ? (
                <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                  <div
                    aria-label="Filter frames by category"
                    className="flex min-w-0 gap-1.5 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-100/80 p-1.5"
                    role="tablist"
                  >
                    {frameCategoryTabs.map((tab) => {
                      const selected = effectiveFrameCategoryId === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => setActiveFrameCategoryId(tab.id)}
                          className={cn(
                            "flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors",
                            selected
                              ? "bg-[#00357B] text-white shadow-sm"
                              : "text-zinc-500 hover:bg-white hover:text-zinc-900",
                          )}
                        >
                          {tab.label}
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                              selected
                                ? "bg-white/15 text-white"
                                : "bg-zinc-200 text-zinc-500",
                            )}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="p-4 sm:p-5">
                <FrameTemplateMultiSelect
                  values={form.frameTemplates}
                  emptyLabel={
                    frameTemplateOptions.length === 0
                      ? "No frame templates yet"
                      : "No frames match this search"
                  }
                  options={visibleFrameTemplates}
                  disabled={readOnly}
                  onChange={(values) =>
                    setForm({
                      ...form,
                      frameTemplates: values,
                      template: values[0] ?? "",
                    })
                  }
                />
              </div>
            </section>
          </TabsContent>

          {/* TAB 3: SYSTEM */}
          <TabsContent
            value="system"
            className="min-h-[340px] space-y-5"
          >
            <div
              data-device-config-tour="settings-pin"
              className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">
                      Settings access PIN
                    </div>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">
                      Protect the Settings page on this tablet. If it is forgotten,
                      the tablet can email a one-time reset link to workspace owners
                      and admins.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      form.protectSettings ? "text-[#00357B]" : "text-zinc-500",
                    )}
                  >
                    {form.protectSettings ? "Protected" : "Not protected"}
                  </span>
                  <Switch
                    checked={form.protectSettings}
                    disabled={readOnly}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, protectSettings: checked })
                    }
                    aria-label="Require PIN to open kiosk settings"
                  />
                </div>
              </div>
              <label className="mt-4 block max-w-md text-xs font-medium text-zinc-600">
                {initialDevice.protectSettings
                  ? "New PIN (leave empty to keep current PIN)"
                  : "PIN (4–12 digits)"}
                <Input
                  className="mt-1.5 h-11 rounded-xl bg-white"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={12}
                  value={form.settingsPin ?? ""}
                  placeholder={
                    initialDevice.protectSettings
                      ? "Keep current PIN"
                      : "e.g. 1234"
                  }
                  disabled={readOnly}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      settingsPin: event.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-zinc-200">
                    <Wrench className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">Maintenance mode</div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Mark this kiosk as unavailable while hardware or software is being serviced.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      maintenanceEnabled ? "text-amber-700" : "text-zinc-500",
                    )}
                  >
                    {maintenanceEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={maintenanceEnabled}
                    disabled={readOnly}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        status: checked ? "maintenance" : "online",
                      })
                    }
                    aria-label="Toggle maintenance mode"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                  <Printer className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Estimated paper remaining</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Replace or calibrate the physical roll here. The tablet receives this state on its next sync.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block text-xs font-medium text-zinc-600">
                  Roll type
                  <Select
                    className="mt-1.5 h-10 rounded-xl bg-white"
                    value={form.paperRollType ?? ""}
                    disabled={readOnly}
                    onChange={(event) => {
                      const isCustom = event.target.value === "custom";
                      const outerDiameterMm = form.paperOuterDiameterMm ?? 80;
                      const coreDiameterMm = form.paperCoreDiameterMm ?? 12;
                      const standardLengthMm =
                        event.target.value === "80x40" ||
                        event.target.value === "80x80"
                          ? BLUEPRINT_OIL_RESISTANT_ROLL_LENGTHS_MM[
                              event.target.value
                            ]
                          : 0;
                      const initialLengthMm = isCustom
                        ? estimatedLengthFromRollDiametersMm(
                            outerDiameterMm,
                            coreDiameterMm,
                          )
                        : standardLengthMm;
                      setForm({
                        ...form,
                        paperRollType: event.target.value,
                        paperInitialLengthMm: initialLengthMm,
                        paperUsedLengthMm: 0,
                        paperInstalledAt: new Date().toISOString(),
                        ...(isCustom
                          ? { paperOuterDiameterMm: outerDiameterMm, paperCoreDiameterMm: coreDiameterMm }
                          : {}),
                      });
                    }}
                  >
                    <option value="">Select roll</option>
                    <option value="80x40">80 x 40 mm · Blueprint Oil Resistant</option>
                    <option value="80x80">80 x 80 mm · Blueprint Oil Resistant</option>
                    <option value="custom">Custom (set your estimate)</option>
                  </Select>
                  <span className="mt-1 block text-[10px] font-normal text-zinc-400">
                    Blueprint Oil Resistant presets: 16.01 m for 80 x 40 and
                    60.19 m for 80 x 80. You can calibrate the length below.
                  </span>
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Estimated initial length (meters)
                  <Input
                    className="mt-1.5 h-10 rounded-xl bg-white"
                    type="number"
                    min={1}
                    max={500}
                    step={0.1}
                    value={paperInitialLengthMm ? paperInitialLengthMm / 1000 : ""}
                    disabled={readOnly}
                    onChange={(event) => setForm({
                      ...form,
                      paperInitialLengthMm: Number(event.target.value) * 1000,
                    })}
                  />
                  <span className="mt-1 block text-[10px] font-normal text-zinc-400">
                    Defaults use Blueprint Oil Resistant. Edit this value when
                    your supplier or roll batch differs.
                  </span>
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Remaining paper (meters)
                  <Input
                    className="mt-1.5 h-10 rounded-xl bg-white"
                    type="number"
                    min={0}
                    max={paperInitialLengthMm / 1000 || 500}
                    step={0.1}
                    value={paperInitialLengthMm ? paperRemainingLengthMm / 1000 : ""}
                    disabled={readOnly || !paperInitialLengthMm}
                    onChange={(event) => setForm({
                      ...form,
                      paperUsedLengthMm: Math.max(
                        0,
                        paperInitialLengthMm - Number(event.target.value) * 1000,
                      ),
                    })}
                  />
                </label>
              </div>
              {isCustomPaperRoll ? (
                <div className="mt-3 grid gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white/70 p-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-zinc-600">
                    Outer roll diameter (mm)
                    <Input
                      className="mt-1.5 h-10 rounded-xl bg-white"
                      type="number"
                      min={10}
                      max={200}
                      step={0.1}
                      value={form.paperOuterDiameterMm ?? 80}
                      disabled={readOnly}
                      onChange={(event) => {
                        const outerDiameterMm = Number(event.target.value);
                        const coreDiameterMm = form.paperCoreDiameterMm ?? 12;
                        setForm({
                          ...form,
                          paperOuterDiameterMm: outerDiameterMm,
                          paperInitialLengthMm: estimatedLengthFromRollDiametersMm(
                            outerDiameterMm,
                            coreDiameterMm,
                          ),
                        });
                      }}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">
                    Inner core diameter (mm)
                    <Input
                      className="mt-1.5 h-10 rounded-xl bg-white"
                      type="number"
                      min={1}
                      max={199}
                      step={0.1}
                      value={form.paperCoreDiameterMm ?? 12}
                      disabled={readOnly}
                      onChange={(event) => {
                        const outerDiameterMm = form.paperOuterDiameterMm ?? 80;
                        const coreDiameterMm = Number(event.target.value);
                        setForm({
                          ...form,
                          paperCoreDiameterMm: coreDiameterMm,
                          paperInitialLengthMm: estimatedLengthFromRollDiametersMm(
                            outerDiameterMm,
                            coreDiameterMm,
                          ),
                        });
                      }}
                    />
                  </label>
                  <p className="sm:col-span-2 text-[10px] leading-4 text-zinc-400">
                    Length is estimated using 0.065 mm thermal paper thickness. You can still calibrate the initial length manually above.
                  </p>
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={readOnly || !form.paperRollType || !paperInitialLengthMm}
                  onClick={() => setForm({
                    ...form,
                    paperUsedLengthMm: 0,
                    paperInstalledAt: new Date().toISOString(),
                  })}
                >
                  Replace roll
                </Button>
              </div>
              {paperInitialLengthMm > 0 ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-zinc-800">{paperRemainingPercent.toFixed(0)}% remaining</span>
                    <span className="text-zinc-500">~{(paperRemainingLengthMm / 1000).toFixed(1)} m · ~{paperPrintsRemaining} prints</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        paperRemainingPercent < 5 ? "bg-red-500" : paperRemainingPercent < 20 ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${paperRemainingPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-zinc-400">
                    Print estimate uses {activePaperTemplate?.name ?? "the default frame"} and its configured print length. Manual feed, failed output, and removed paper are not detectable.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                  <Printer className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Printer & output tuning</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Review the latest printer report and tune output for this booth only.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-medium text-zinc-500">
                    Connection
                  </div>
                  <div
                    className={cn(
                      "mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      printerConnected
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700",
                    )}
                  >
                    {printerConnected ? "Connected" : "Disconnected"}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {deviceInitial.printerName || "Printer belum dikonfigurasi"}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-medium text-zinc-500">
                    Device report
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-900">
                    {printerStatus.replaceAll("_", " ")}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {deviceInitial.printerLastError ||
                      (deviceInitial.printerStatusUpdatedAt
                        ? `Updated ${deviceInitial.printerStatusUpdatedAt}`
                        : "Waiting for kiosk status update.")}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="block text-xs font-medium text-zinc-600">
                  Bottom safe zone (0–24 mm)
                  <Input
                    className="mt-1.5 h-10 rounded-xl bg-white"
                    type="number"
                    min={PRINTER_TUNING_LIMITS.bottomSafeZoneMm.min}
                    max={PRINTER_TUNING_LIMITS.bottomSafeZoneMm.max}
                    step={PRINTER_TUNING_LIMITS.bottomSafeZoneMm.step}
                    value={form.printerBottomSafeZoneMm ?? 0}
                    disabled={readOnly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        printerBottomSafeZoneMm: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Brightness (-100 to +100)
                  <Input
                    className="mt-1.5 h-10 rounded-xl bg-white"
                    type="number"
                    min={PRINTER_TUNING_LIMITS.brightness.min}
                    max={PRINTER_TUNING_LIMITS.brightness.max}
                    step={PRINTER_TUNING_LIMITS.brightness.step}
                    value={form.printerBrightness ?? 0}
                    disabled={readOnly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        printerBrightness: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Contrast (-100 to +100)
                  <Input
                    className="mt-1.5 h-10 rounded-xl bg-white"
                    type="number"
                    min={PRINTER_TUNING_LIMITS.contrast.min}
                    max={PRINTER_TUNING_LIMITS.contrast.max}
                    step={PRINTER_TUNING_LIMITS.contrast.step}
                    value={form.printerContrast ?? 0}
                    disabled={readOnly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        printerContrast: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Dot density (0.5–1.5)
                  <Input
                    className="mt-1.5 h-10 rounded-xl bg-white"
                    type="number"
                    min={PRINTER_TUNING_LIMITS.dotDensity.min}
                    max={PRINTER_TUNING_LIMITS.dotDensity.max}
                    step={PRINTER_TUNING_LIMITS.dotDensity.step}
                    value={form.printerDotDensity ?? 1}
                    disabled={readOnly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        printerDotDensity: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="mt-2 text-[10px] text-zinc-400">
                These values are saved per device and synced to the Flutter
                printer settings.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                  <Timer className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Countdown overrides</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Leave fields empty to inherit the organization defaults.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block rounded-2xl border border-zinc-200 bg-white p-4 text-xs font-medium text-zinc-600 shadow-sm">
                  Session countdown (seconds)
                  <Input
                    className="mt-2 h-10 rounded-xl bg-zinc-50"
                    type="number"
                    min={30}
                    max={1800}
                    placeholder="e.g. 300 (5 min) — leave empty for default"
                    value={form.sessionCountdownSeconds ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sessionCountdownSeconds:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <span className="mt-1 block text-[10px] text-zinc-400">
                    30s – 30min · total time for template → thanks flow
                  </span>
                </label>
                <label className="block rounded-2xl border border-zinc-200 bg-white p-4 text-xs font-medium text-zinc-600 shadow-sm">
                  Payment countdown (seconds)
                  <Input
                    className="mt-2 h-10 rounded-xl bg-zinc-50"
                    type="number"
                    min={10}
                    max={600}
                    placeholder="e.g. 60 — leave empty to use default"
                    value={form.paymentCountdownSeconds ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentCountdownSeconds:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div
          data-device-config-tour="save"
          className="sticky -bottom-4 z-30 mt-6 flex flex-col gap-3 border-t border-zinc-200 bg-white/95 px-4 py-4 shadow-[0_-18px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:-bottom-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            {onDelete && !readOnly ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                Delete device
              </Button>
            ) : null}
            {formError ? (
              <p role="alert" className="min-w-0 text-xs font-medium text-red-600">
                {formError}
              </p>
            ) : null}
          </div>
          {readOnly ? (
            <div className="flex justify-end">
              <Button type="button" className="rounded-xl px-6" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl px-5"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-zinc-950 px-6 shadow-lg shadow-zinc-950/10 hover:bg-zinc-800"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitting ? "Saving..." : "Save configuration"}
              </Button>
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function includeCurrentOptions(
  options: string[],
  currentValues?: string[] | null,
) {
  const values = normalizeStringList(currentValues);
  return [...values.filter((value) => !options.includes(value)), ...options];
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

function findAssignedProduct(
  products: PricingProduct[],
  assignments: string[],
) {
  return products.find((product) =>
    assignments.some(
      (assignment) => assignment === product.id || assignment === product.name,
    ),
  );
}

function isEventExpired(product: PricingProduct) {
  if (!product.eventExpiresAt) return false;
  const expiryTime = Date.parse(product.eventExpiresAt);
  return Number.isFinite(expiryTime) && expiryTime <= Date.now();
}

function SessionModeButton({
  title,
  description,
  icon: Icon,
  selected,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative flex min-h-24 flex-col items-start rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2",
        selected
          ? "border-[#00357B] bg-blue-50/80 shadow-sm"
          : "border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-45 hover:translate-y-0 hover:shadow-none",
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          selected ? "bg-[#00357B] text-white" : "bg-zinc-100 text-zinc-500",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="mt-3 text-xs font-semibold text-zinc-900">{title}</span>
      <span className="mt-0.5 text-[10px] leading-4 text-zinc-500">
        {description}
      </span>
      <span
        className={cn(
          "absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full border transition-colors",
          selected
            ? "border-[#00357B] bg-[#00357B] text-white"
            : "border-zinc-200 bg-white text-transparent",
        )}
      >
        <Check className="size-3" />
      </span>
    </button>
  );
}

function ThemePicker({
  value,
  options,
  className,
  disabled,
  onChange,
}: {
  value: string;
  options: ThemeOption[];
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={!value}
        onClick={() => onChange("")}
        className={cn(
          "relative min-h-32 overflow-hidden rounded-2xl border bg-white p-3 text-left transition-[border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2",
          !value
            ? "border-[#00357B] ring-2 ring-[#00357B]/10"
            : "border-zinc-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md",
          disabled && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none",
        )}
      >
        <div className="grid aspect-video place-items-center rounded-xl bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_58%),#f4f4f5] text-[#00357B]">
          <Sparkles className="size-5" />
        </div>
        <p className="mt-2 truncate text-xs font-semibold text-zinc-900">Default theme</p>
        <p className="mt-0.5 text-[10px] text-zinc-500">Organization fallback</p>
        <SelectionCheck selected={!value} />
      </button>
      {options.map((theme) => {
        const selected = value === theme.id;
        return (
          <button
            type="button"
            key={theme.id}
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(theme.id)}
            className={cn(
              "relative min-h-32 overflow-hidden rounded-2xl border bg-white p-3 text-left transition-[border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2",
              selected
                ? "border-[#00357B] ring-2 ring-[#00357B]/10"
                : "border-zinc-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md",
              disabled && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none",
            )}
          >
            {theme.schema ? (
              <ThemeThumbnail schema={theme.schema} className="rounded-xl" />
            ) : (
              <div className="grid aspect-video place-items-center rounded-xl bg-zinc-100 text-zinc-400">
                <Layers3 className="size-5" />
              </div>
            )}
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-900">
                {theme.name}
              </p>
              {theme.isActive ? (
                <span className="shrink-0 text-[9px] font-semibold text-emerald-700">
                  Active
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[10px] capitalize text-zinc-500">
              {theme.status || "Saved layout"}
            </p>
            <SelectionCheck selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

function SelectionCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full border shadow-sm transition-colors",
        selected
          ? "border-[#00357B] bg-[#00357B] text-white"
          : "border-white/90 bg-white/85 text-transparent",
      )}
    >
      <Check className="size-3.5" />
    </span>
  );
}

function EventProductSelect({
  value,
  products,
  className,
  onChange,
  disabled,
}: {
  value: string;
  products: PricingProduct[];
  className?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selectableProducts = products.filter(
    (product) => product.active && !isEventExpired(product),
  );
  const currentProduct = products.find(
    (product) => product.id === value || product.name === value,
  );
  const normalizedProducts =
    currentProduct &&
    !selectableProducts.some((product) => product.id === currentProduct.id)
      ? [currentProduct, ...selectableProducts]
      : selectableProducts;

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-zinc-600">
        Active event
        <Select
          className="mt-1.5 h-10 rounded-xl bg-white"
          value={value}
          disabled={disabled || normalizedProducts.length === 0}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            {normalizedProducts.length === 0
              ? "No active event available"
              : "Choose an event"}
          </option>
          {normalizedProducts.map((product) => {
            const unavailable = !product.active || isEventExpired(product);
            return (
              <option
                key={product.id}
                value={product.id}
                disabled={unavailable}
              >
                {product.eventName || product.name}
                {unavailable ? " (inactive or expired)" : ""}
              </option>
            );
          })}
        </Select>
      </label>
      <p className="mt-2 text-[10px] leading-4 text-zinc-400">
        One event only. Visitors go directly from Landing to the frame picker.
      </p>
    </div>
  );
}

function FrameTemplateMultiSelect({
  values,
  emptyLabel,
  options,
  className,
  onChange,
  disabled,
}: {
  values: string[];
  emptyLabel: string;
  options: FrameTemplateOption[];
  className?: string;
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const selectedValues = normalizeStringList(values);

  const toggleValue = (id: string) => {
    if (disabled) return;
    onChange(
      selectedValues.includes(id)
        ? selectedValues.filter((value) => value !== id)
        : [...selectedValues, id],
    );
  };

  return (
    <div className={className}>
      {options.length === 0 ? (
        <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-white px-5 text-center">
          <div>
            <ImageIcon className="mx-auto size-8 text-zinc-300" />
            <p className="mt-3 text-xs font-medium text-zinc-500">{emptyLabel}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {options.map((template) => {
            const selected = selectedValues.includes(template.id);
            return (
              <button
                key={template.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => toggleValue(template.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-white text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2",
                  selected
                    ? "border-[#00357B] shadow-md shadow-blue-950/5 ring-2 ring-[#00357B]/10"
                    : "border-zinc-200 hover:-translate-y-0.5 hover:border-[#00357B]/35 hover:shadow-lg hover:shadow-zinc-950/5",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <div
                  className="relative aspect-[4/5] overflow-hidden border-b border-zinc-100 bg-zinc-50 p-3"
                  style={{
                    backgroundColor: template.accentColor
                      ? `${template.accentColor}12`
                      : undefined,
                  }}
                >
                  {template.frameImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.frameImageUrl}
                      alt={`Preview ${template.name}`}
                      className="size-full object-contain"
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-zinc-400">
                      <ImageIcon
                        className="size-7"
                        style={{ color: template.accentColor }}
                      />
                      <span className="text-[10px] font-medium">
                        Preview unavailable
                      </span>
                    </div>
                  )}
                  <SelectionCheck selected={selected} />
                </div>
                <div className="min-w-0 p-3">
                  <p className="truncate text-xs font-semibold text-zinc-950">
                    {template.name}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {template.photoCount
                      ? `${template.photoCount} photos`
                      : "Frame"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function normalizeFrameTemplateAssignments(
  values: string[] | null | undefined,
  fallback: string | null | undefined,
  options: FrameTemplateOption[],
) {
  return normalizeStringList(values, fallback).map(
    (value) =>
      options.find(
        (template) => template.id === value || template.name === value,
      )?.id ?? value,
  );
}

function normalizeLayoutSchemaAssignment(
  value: string | null | undefined,
  legacyName: string | null | undefined,
  options: ThemeOption[],
) {
  const candidate = value?.trim() || legacyName?.trim() || "";
  if (!candidate) return null;
  return (
    options.find(
      (option) => option.id === candidate || option.name === candidate,
    )?.id ?? candidate
  );
}

function includeCurrentThemeOptions(
  options: ThemeOption[],
  currentId: string | null | undefined,
  legacyName: string | null | undefined,
) {
  const normalizedId = currentId?.trim();
  if (!normalizedId || options.some((option) => option.id === normalizedId)) {
    return options;
  }
  return [
    { id: normalizedId, name: legacyName?.trim() || normalizedId },
    ...options,
  ];
}

function DeviceMultiSelect({
  label,
  values,
  emptyLabel,
  options,
  className,
  onChange,
  disabled,
}: {
  label?: string;
  values: string[];
  emptyLabel: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const selectedValues = normalizeStringList(values);
  const normalizedOptions = [
    ...selectedValues
      .filter((value) => !options.some((option) => option.value === value))
      .map((value) => ({ value, label: value })),
    ...options,
  ];

  const toggleValue = (option: string) => {
    if (disabled) return;
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((value) => value !== option));
      return;
    }
    onChange([...selectedValues, option]);
  };

  return (
    <div className={cn("block text-xs font-medium text-zinc-600", className)}>
      {label ? <div>{label}</div> : null}
      <div className="mt-1.5 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm">
        {normalizedOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-xs font-normal text-zinc-400">
            {emptyLabel}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {normalizedOptions.map((option) => {
              const selected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleValue(option.value)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-[border-color,background-color,transform] active:scale-[0.98]",
                    selected
                      ? "border-[#00357B] bg-[#00357B] text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400 hover:bg-white hover:text-zinc-950",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  {selected ? <Check className="size-3.5" /> : null}
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selectedValues.length > 0 ? (
        <div className="mt-1 text-[10px] font-normal text-zinc-400">
          {selectedValues.length} selected
        </div>
      ) : null}
    </div>
  );
}
