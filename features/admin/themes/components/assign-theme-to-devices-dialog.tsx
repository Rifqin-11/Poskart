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
          ? `Theme "${layout.name}" assigned to ${selected.size} device${selected.size > 1 ? "s" : ""}.`
          : `Theme "${layout.name}" created without device assignment.`,
      );
      onDone();
    } catch (error) {
      showErrorToast(
        "Tidak dapat menerapkan theme",
        error,
        "Theme sudah dibuat, tetapi belum berhasil diterapkan ke device. Coba lagi.",
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
              Assign theme to devices
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Theme <span className="font-medium text-zinc-700">{layout.name}</span> sudah dibuat. Pilih kiosk yang akan menggunakannya.
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
              <p className="text-sm text-zinc-500">No devices registered yet</p>
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
                  {selected.size === devices.length ? "Deselect all" : "Select all"}
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
                            current
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                        {device.location} · {device.theme || "no theme assigned"}
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
            Skip for now
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={assigning}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {assigning ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
            {assigning
              ? "Assigning…"
              : selected.size > 0
                ? `Assign to ${selected.size} device${selected.size > 1 ? "s" : ""}`
                : "Create without assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
