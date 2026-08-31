"use client";

import { useState } from "react";
import { Check, Loader2, Monitor, Power, Smartphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DeviceStatusBadge,
  getDeviceStatusMeta,
} from "@/components/ui/device-status-badge";
import { showErrorToast, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useBooths, useUpdateBooth } from "@/features/admin/devices/use-devices";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { LayoutSchemaRow } from "@/features/admin/layout/api";

export function AssignThemeToDevicesDialog({
  layout,
  onClose,
  onDone,
}: {
  layout: LayoutSchemaRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const { data: devices = [], isLoading: devicesLoading } = useBooths();
  const updateBooth = useUpdateBooth();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [assigning, setAssigning] = useState(false);

  const toggleDevice = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(
      selected.size === devices.length
        ? new Set()
        : new Set(devices.map((device) => device.id)),
    );
  };

  const handleConfirm = async () => {
    setAssigning(true);
    try {
      await Promise.all(
        Array.from(selected).map((deviceId) =>
          updateBooth.mutateAsync({
            id: deviceId,
            patch: { theme: layout.name },
          }),
        ),
      );
      toast.success(
        selected.size > 0
          ? t("themes.themeAssigned")
              .replace("{name}", layout.name)
              .replace("{count}", String(selected.size))
              .replace("{devices}", selected.size > 1 ? t("themes.devicesCount") : t("themes.deviceCount"))
          : t("themes.themeCreatedNoAssignment").replace("{name}", layout.name),
      );
      onDone();
    } catch (error) {
      showErrorToast(
        t("themes.activationFailed"),
        error,
        t("themes.themeApplyFailed"),
      );
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {t("themes.assignTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {t("themes.assignDesc").replace("{name}", layout.name)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close assignment dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {devicesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-zinc-400" />
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Monitor className="mb-2 size-8 text-zinc-300" />
             <p className="text-sm text-zinc-500">{t("themes.noDevices")}</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleAll}
                className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-2.5 text-left hover:bg-zinc-50"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    selected.size === devices.length
                      ? "border-zinc-900 bg-zinc-900"
                      : "border-zinc-300",
                  )}
                >
                  {selected.size === devices.length && (
                    <Check className="size-2.5 text-white stroke-[3]" />
                  )}
                </span>
                <span className="text-xs font-semibold text-zinc-600">
                   {selected.size === devices.length ? t("themes.deselectAll") : t("themes.selectAll")}
                </span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {devices.length}
                </Badge>
              </button>
              {devices.map((device) => {
                const isSelected = selected.has(device.id);
                const hasCurrentTheme = device.theme === layout.name;
                return (
                  <button
                    type="button"
                    key={device.id}
                    onClick={() => toggleDevice(device.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                      isSelected && "bg-zinc-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-zinc-900 bg-zinc-900"
                          : "border-zinc-300",
                      )}
                    >
                      {isSelected && <Check className="size-2.5 text-white stroke-[3]" />}
                    </span>
                    <span className="relative shrink-0">
                      <Smartphone className="size-5 text-zinc-400" />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white",
                          getDeviceStatusMeta(device.status).dotClassName,
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-zinc-800">
                          {device.name}
                        </span>
                        {hasCurrentTheme && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                             {t("themes.current")}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                         {device.location} · {device.theme || t("themes.noTheme")}
                      </span>
                    </span>
                    <DeviceStatusBadge
                      status={device.status}
                      className="rounded-full px-2 py-0.5 text-[10px]"
                    />
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            {t("themes.skipForNow")}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={assigning}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {assigning ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
            {assigning
              ? t("themes.assigning")
              : selected.size > 0
                ? t("themes.assignTo").replace("{count}", String(selected.size))
                : t("themes.createWithoutAssignment")}
          </button>
        </div>
      </div>
    </div>
  );
}
