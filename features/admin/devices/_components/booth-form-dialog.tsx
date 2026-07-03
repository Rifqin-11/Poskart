"use client";

import { useState } from "react";
import { Wrench, Printer, Timer, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import type { BoothInput } from "@/features/admin/devices/api";
import { PRINTER_TUNING_LIMITS } from "@/lib/printer-tuning";
import { cn } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type { Device } from "@/types/device";

type DeviceFormOptions = {
  themes: string[];
  frameTemplates: string[];
  pricingProfiles: string[];
};

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
  const [form, setForm] = useState<BoothInput>(() => {
    const { id: _ignored, ...rest } = initial as Device;
    void _ignored;
    return {
      ...rest,
      frameTemplates: normalizeStringList(rest.frameTemplates, rest.template),
      pricingProfiles: normalizeStringList(
        rest.pricingProfiles,
        rest.pricingProfile,
      ),
    } as BoothInput;
  });

  const deviceInitial = initial as Partial<Device>;
  const printerStatus = deviceInitial.printerStatus ?? "unknown";
  const printerConnected = printerStatus === "ready";
  const runtimeStatus = form.status;
  const maintenanceEnabled = runtimeStatus === "maintenance";

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
          onSubmit(form);
        }}
      >
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1 rounded-2xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* TAB 1: GENERAL */}
          <TabsContent
            value="general"
            className="grid min-h-[340px] gap-3 md:grid-cols-2"
          >
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
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="PVJ Bandung"
                disabled={readOnly}
              />
            </label>
            <div className="block text-xs font-medium text-zinc-600">
              Runtime status
              <div className="mt-1 flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                <Badge
                  variant={
                    runtimeStatus === "online"
                      ? "success"
                      : runtimeStatus === "maintenance"
                        ? "warning"
                        : "destructive"
                  }
                >
                  {runtimeStatus}
                </Badge>
                <span className="text-[11px] font-normal text-zinc-400">
                  Based on kiosk heartbeat
                </span>
              </div>
              <p className="mt-1 text-[10px] font-normal text-zinc-400">
                Online/offline is detected from the app heartbeat. Use System to
                enable maintenance mode.
              </p>
            </div>
            <div className="block text-xs font-medium text-zinc-600">
              App version
              <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
                {form.appVersion || "Waiting for device sync"}
              </div>
              <p className="mt-1 text-[10px] font-normal text-zinc-400">
                App version is reported by the kiosk device and cannot be edited
                manually.
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
          </TabsContent>

          {/* TAB 2: EXPERIENCE */}
          <TabsContent
            value="experience"
            className="grid min-h-[340px] gap-3 md:grid-cols-2"
          >
            <label className="block text-xs font-medium text-zinc-600">
              Theme / layout
              <Select
                className="mt-1"
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
              <span className="mt-1 block text-[10px] font-normal text-zinc-400">
                Controls the kiosk visual layout.
              </span>
            </label>
            <div className="block text-xs font-medium text-zinc-600">
              Frame templates
              <DeviceMultiSelect
                className="mt-1"
                values={form.frameTemplates}
                emptyLabel="No frame templates yet"
                options={includeCurrentOptions(
                  options.frameTemplates,
                  form.frameTemplates,
                )}
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
            <div className="md:col-span-2 block text-xs font-medium text-zinc-600">
              Pricing packages
              <DeviceMultiSelect
                className="mt-1"
                values={form.pricingProfiles}
                emptyLabel="No active pricing packages yet"
                options={includeCurrentOptions(
                  options.pricingProfiles,
                  form.pricingProfiles,
                )}
                disabled={readOnly}
                onChange={(values) =>
                  setForm({
                    ...form,
                    pricingProfiles: values,
                    pricingProfile: values[0] ?? "",
                  })
                }
              />
            </div>
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
      <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm">
        {normalizedOptions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs font-normal text-zinc-400">
            {emptyLabel}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {normalizedOptions.map((option) => {
              const selected = selectedValues.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleValue(option)}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
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
