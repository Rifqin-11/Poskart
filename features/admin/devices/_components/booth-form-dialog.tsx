"use client";

import { useState } from "react";
import {
  Check,
  CreditCard,
  ImageIcon,
  Layers3,
  Printer,
  Timer,
  Trash2,
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
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import type { BoothInput, PricingProduct } from "@/features/admin/devices/api";
import { PRINTER_TUNING_LIMITS } from "@/lib/printer-tuning";
import { cn } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type { Device } from "@/types/device";

type DeviceFormOptions = {
  themes: string[];
  frameTemplates: string[];
  pricingProducts: PricingProduct[];
};

type SessionAccessMode = "" | "paid" | "event";

type BoothFormDialogProps = {
  title: string;
  initial: BoothInput | Device;
  options: DeviceFormOptions;
  submitting: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (values: BoothInput) => void;
};

export function BoothFormDialog({
  title,
  initial,
  options,
  submitting,
  onClose,
  onDelete,
  onSubmit,
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
        findAssignedProduct(paidProducts, [assignment])?.name ?? assignment,
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
    initialEventProduct?.name ?? "",
  );
  const [form, setForm] = useState<BoothInput>(() => {
    const { id: _ignored, ...rest } = initial as Device;
    void _ignored;
    const pricingProfiles = initialEventProduct
      ? [initialEventProduct.name]
      : defaultPaidSelections;
    return {
      ...rest,
      frameTemplates: normalizeStringList(rest.frameTemplates, rest.template),
      pricingProfile: pricingProfiles[0] ?? "",
      pricingProfiles,
    } as BoothInput;
  });

  const deviceInitial = initial as Partial<Device>;
  const printerStatus = deviceInitial.printerStatus ?? "unknown";
  const printerConnected = printerStatus === "ready";
  const runtimeStatus = form.status;
  const maintenanceEnabled = runtimeStatus === "maintenance";
  const frameTemplateOptions = includeCurrentOptions(
    options.frameTemplates,
    form.frameTemplates,
  );
  const allFramesSelected =
    frameTemplateOptions.length > 0 &&
    frameTemplateOptions.every((template) =>
      form.frameTemplates.includes(template),
    );

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
      className="max-w-5xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.location.trim()) {
            toast.error("Name and location are required");
            return;
          }
          if (!sessionMode) {
            toast.error("Choose Pricing or Event access");
            return;
          }
          if (form.pricingProfiles.length === 0) {
            toast.error(
              sessionMode === "event"
                ? "Choose one active event"
                : "Choose at least one paid package",
            );
            return;
          }
          if (
            sessionMode === "event" &&
            !eventProducts.some(
              (product) =>
                product.name === eventSelection &&
                product.active &&
                !isEventExpired(product),
            )
          ) {
            toast.error("The selected event is inactive or expired");
            return;
          }
          onSubmit(form);
        }}
      >
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1 rounded-2xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="frame">Frame</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* TAB 1: GENERAL */}
          <TabsContent
            value="general"
            className="min-h-[340px] max-h-[480px] space-y-4 overflow-y-auto pr-1"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600">
                Name
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Device 01"
                  disabled={readOnly}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Location
                <Input
                  className="mt-1"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="PVJ Bandung"
                  disabled={readOnly}
                />
              </label>
              <div className="block text-xs font-medium text-zinc-600">
                App version
                <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
                  {form.appVersion || "Waiting for device sync"}
                </div>
                <p className="mt-1 text-[10px] font-normal text-zinc-400">
                  App version is reported by the kiosk device and cannot be
                  edited manually.
                </p>
              </div>
              <div className="block text-xs font-medium text-zinc-600">
                Last sync
                <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
                  {form.lastSync || "Waiting for device sync"}
                </div>
                <p className="mt-1 text-[10px] font-normal text-zinc-400">
                  Sync time is reported by the kiosk device.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <section className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200">
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
                <Select
                  className="mt-4 bg-white"
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  disabled={readOnly}
                >
                  <option value="">Use default theme</option>
                  {includeCurrentOption(options.themes, form.theme).map(
                    (theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ),
                  )}
                </Select>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200">
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

                <label className="mt-4 block text-xs font-medium text-zinc-600">
                  Session type
                  <Select
                    className="mt-1 bg-white"
                    value={sessionMode}
                    disabled={readOnly}
                    onChange={(event) => {
                      const mode = event.target.value as SessionAccessMode;
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
                    }}
                  >
                    <option value="" disabled>
                      Choose Pricing or Event
                    </option>
                    <option value="paid" disabled={paidProducts.length === 0}>
                      Pricing
                    </option>
                    <option
                      value="event"
                      disabled={
                        !initialEventProduct &&
                        !eventProducts.some(
                          (product) =>
                            product.active && !isEventExpired(product),
                        )
                      }
                    >
                      Event
                    </option>
                  </Select>
                </label>

                {sessionMode === "paid" ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-zinc-600">
                      Available packages
                    </p>
                    <DeviceMultiSelect
                      values={paidSelections}
                      emptyLabel="No active paid packages yet"
                      options={includeCurrentOptions(
                        paidProducts.map((product) => product.name),
                        paidSelections,
                      )}
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
                  <p className="mt-3 rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-4 text-xs text-zinc-500">
                    Select a session type to configure visitor access.
                  </p>
                )}
              </section>
            </div>
          </TabsContent>

          {/* TAB 2: FRAME */}
          <TabsContent value="frame" className="min-h-[340px]">
            <section className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Frame templates
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Select which frames visitors can use on this booth.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">
                    {form.frameTemplates.length} selected
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={readOnly || frameTemplateOptions.length === 0}
                    onClick={toggleAllFrames}
                  >
                    {allFramesSelected ? "Clear all" : "Select all"}
                  </Button>
                </div>
              </div>
              <DeviceMultiSelect
                className="mt-4"
                values={form.frameTemplates}
                emptyLabel="No frame templates yet"
                options={frameTemplateOptions}
                disabled={readOnly}
                onChange={(values) =>
                  setForm({
                    ...form,
                    frameTemplates: values,
                    template: values[0] ?? "",
                  })
                }
              />
            </section>
          </TabsContent>

          {/* TAB 3: SYSTEM */}
          <TabsContent
            value="system"
            className="min-h-[340px] max-h-[420px] space-y-4 overflow-y-auto pr-1"
          >
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/30 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    <Wrench className="size-3.5" /> Maintenance mode
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Marks this kiosk as maintenance from the web. Flutter-side
                    blocking behavior can be wired later.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-3 py-2">
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

            <div className="rounded-lg border border-zinc-200 bg-zinc-50/30 p-3">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <Printer className="size-3.5" /> Printer status
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
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
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
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
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <label className="block text-xs font-medium text-zinc-600">
                  Bottom safe zone (0–24 mm)
                  <Input
                    className="mt-1 bg-white"
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
                    className="mt-1 bg-white"
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
                    className="mt-1 bg-white"
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
                    className="mt-1 bg-white"
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

            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Timer className="size-3.5" /> Countdown overrides (optional)
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-zinc-600">
                  Session countdown (seconds)
                  <Input
                    className="mt-1 bg-white"
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
                <label className="block text-xs font-medium text-zinc-600">
                  Payment countdown (seconds)
                  <Input
                    className="mt-1 bg-white"
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

        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {onDelete && !readOnly ? (
              <Button type="button" variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                Delete device
              </Button>
            ) : null}
          </div>
          {readOnly ? (
            <div className="flex justify-end">
              <Button type="button" className="rounded-2xl" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <DialogActions
              submitting={submitting}
              submitLabel="Save configuration"
              submittingLabel="Saving..."
              onCancel={onClose}
            />
          )}
        </div>
      </form>
    </Dialog>
  );
}

function includeCurrentOption(options: string[], currentValue?: string | null) {
  if (!currentValue || options.includes(currentValue)) return options;
  return [currentValue, ...options];
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
  const currentProduct = products.find((product) => product.name === value);
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
          className="mt-1"
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
                value={product.name}
                disabled={unavailable}
              >
                {product.eventName || product.name}
                {unavailable ? " (inactive or expired)" : ""}
              </option>
            );
          })}
        </Select>
      </label>
      <p className="mt-1 text-[10px] leading-4 text-zinc-400">
        One event only. Visitors go directly from Landing to the frame picker.
      </p>
    </div>
  );
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
  options: string[];
  className?: string;
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const selectedValues = normalizeStringList(values);
  const normalizedOptions = includeCurrentOptions(options, selectedValues);

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
      <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 shadow-sm">
        {normalizedOptions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs font-normal text-zinc-400">
            {emptyLabel}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {normalizedOptions.map((option) => {
              const selected = selectedValues.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleValue(option)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {selected ? <Check className="size-3.5" /> : null}
                  {option}
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
