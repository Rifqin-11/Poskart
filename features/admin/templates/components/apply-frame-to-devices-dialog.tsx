"use client";

import { Check, MonitorCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DeviceStatusBadge } from "@/components/ui/device-status-badge";
import { cn } from "@/lib/utils";
import type { Device } from "@/types/device";

type ApplyFrameToDevicesDialogProps = {
  open: boolean;
  frameName: string;
  devices: Device[];
  isLoading: boolean;
  selectedDeviceIds: string[];
  isApplying: boolean;
  onToggleDevice: (deviceId: string) => void;
  onToggleAll: () => void;
  onSkip: () => void;
  onApply: () => void;
};

export function ApplyFrameToDevicesDialog({
  open,
  frameName,
  devices,
  isLoading,
  selectedDeviceIds,
  isApplying,
  onToggleDevice,
  onToggleAll,
  onSkip,
  onApply,
}: ApplyFrameToDevicesDialogProps) {
  const selected = new Set(selectedDeviceIds);
  const allSelected =
    devices.length > 0 && selectedDeviceIds.length === devices.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isApplying) onSkip();
      }}
      title="Terapkan frame ke devices"
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-zinc-600">
            Frame{" "}
            <span className="font-semibold text-zinc-900">{frameName}</span>{" "}
            berhasil dibuat. Pilih devices yang ingin menggunakan frame ini.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Devices yang tidak dipilih tetap menggunakan frame sebelumnya.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Memuat devices...
            </p>
          </div>
        ) : devices.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
              <span className="text-xs font-medium text-zinc-500">
                {selectedDeviceIds.length} dari {devices.length} dipilih
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleAll}
              >
                {allSelected ? "Batalkan semua" : "Pilih semua"}
              </Button>
            </div>
            <div className="max-h-64 divide-y divide-zinc-100 overflow-y-auto">
              {devices.map((device) => {
                const isSelected = selected.has(device.id);
                return (
                  <label
                    key={device.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-zinc-50",
                      isSelected && "bg-zinc-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => onToggleDevice(device.id)}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                        isSelected
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-300 bg-white text-transparent",
                      )}
                    >
                      <Check className="size-3.5" />
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#00357B] text-white">
                      <MonitorCog className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900">
                        {device.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-400">
                        {device.location || device.id}
                      </span>
                    </span>
                    <DeviceStatusBadge
                      status={device.status}
                      className="shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Belum ada devices
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Frame tetap tersimpan dan bisa diterapkan dari halaman Devices
              nanti.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={isApplying}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={selectedDeviceIds.length === 0 || isApplying}
          >
            {isApplying ? "Menerapkan..." : "Terapkan ke device"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
