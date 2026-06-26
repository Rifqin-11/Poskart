"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Layers,
  Loader2,
  MoreVertical,
  Monitor,
  Power,
  PowerOff,
  Printer,
  Plus,
  RefreshCw,
  ScanLine,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeThumbnail } from "@/features/admin/themes/theme-thumbnail";
import {
  useLayoutSchemas,
  useActiveThemeStatistics,
  useSetActiveLayout,
  useDeactivateLayout,
  useDeleteLayout,
} from "@/features/admin/layout/use-layout";
import { useBooths, useUpdateBooth } from "@/features/admin/devices/use-devices";
import type { LayoutSchemaRow } from "@/server/admin/_shared/admin-types";
import type { Device } from "@/types/device";
import { cn } from "@/lib/utils";

// ── Assign Devices Modal ─────────────────────────────────────────────────────

function AssignDevicesModal({
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
  const [activating, setActivating] = useState(false);

  const toggleDevice = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === devices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(devices.map((d) => d.id)));
    }
  };



  const statusColor: Record<Device["status"], string> = {
    online: "bg-emerald-400",
    offline: "bg-zinc-300",
    maintenance: "bg-amber-400",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Assign to Devices</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Select which kiosks will use{" "}
              <span className="font-medium text-zinc-700">{layout.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Device list */}
        <div className="max-h-72 overflow-y-auto">
          {devicesLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-zinc-400" />
            </div>
          )}
          {!devicesLoading && devices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Monitor className="mb-2 size-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">No devices registered yet</p>
            </div>
          )}
          {!devicesLoading && devices.length > 0 && (
            <>
              {/* Select all row */}
              <button
                onClick={toggleAll}
                className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-2.5 hover:bg-zinc-50 text-left"
              >
                <div
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
                </div>
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
                    key={device.id}
                    onClick={() => toggleDevice(device.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                      isSelected && "bg-zinc-50",
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected ? "border-zinc-900 bg-zinc-900" : "border-zinc-300",
                      )}
                    >
                      {isSelected && (
                        <Check className="size-2.5 text-white stroke-[3]" />
                      )}
                    </div>
                    {/* Icon */}
                    <div className="relative shrink-0">
                      <Smartphone className="size-5 text-zinc-400" />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white",
                          statusColor[device.status],
                        )}
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-zinc-800">
                          {device.name}
                        </p>
                        {hasCurrentTheme && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                            current
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                        {device.location} · {device.theme || "no theme assigned"}
                      </p>
                    </div>
                    {/* Status badge */}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        device.status === "online"
                          ? "bg-emerald-100 text-emerald-700"
                          : device.status === "offline"
                            ? "bg-zinc-100 text-zinc-500"
                            : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {device.status}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-5 py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={activating}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {activating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Power className="size-3.5" />
            )}
            {activating ? "Activating…" : `Activate${selected.size > 0 ? ` & assign (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );

  async function handleConfirm() {
    setActivating(true);
    try {
      await Promise.all(
        Array.from(selected).map((deviceId) =>
          updateBooth.mutateAsync({ id: deviceId, patch: { theme: layout.name } }),
        ),
      );
      toast.success(
        selected.size > 0
          ? `Theme "${layout.name}" assigned to ${selected.size} device${selected.size > 1 ? "s" : ""}.`
          : `Theme "${layout.name}" activated.`,
      );
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setActivating(false);
    }
  }
}

// ── BuilderThemesPage ────────────────────────────────────────────────────────

export function BuilderThemesPage() {
  const { data: layouts = [], isLoading } = useLayoutSchemas();
  const setActive = useSetActiveLayout();
  const deactivate = useDeactivateLayout();
  const deleteLayout = useDeleteLayout();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  /** Layout pending activation — opens the assign-to-devices modal */
  const [assignModal, setAssignModal] = useState<LayoutSchemaRow | null>(null);

  const activeLayout = layouts.find((l) => l.is_active);
  const {
    data: activeThemeStatistics,
    isFetching: statisticsLoading,
    isError: statisticsError,
    refetch: refreshStatistics,
  } = useActiveThemeStatistics(activeLayout?.name ?? null);

  /** Activate theme in DB (sets is_active = true) */
  const handleActivate = async (id: string) => {
    setLoadingId(id);
    try {
      await setActive.mutateAsync(id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to activate theme",
      );
    } finally {
      setLoadingId(null);
    }
  };

  /** Called after modal confirms — activate then close modal */
  const handleActivateWithAssign = async (layout: LayoutSchemaRow) => {
    await handleActivate(layout.id);
    setAssignModal(null);
  };

  const handleDeactivate = async (id: string) => {
    setLoadingId(id);
    try {
      await deactivate.mutateAsync(id);
      toast.success("Theme deactivated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate theme",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      await deleteLayout.mutateAsync(id);
      setConfirmDelete(null);
      toast.success("Theme deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete theme",
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Builder Themes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Layouts saved from the Visual Builder. Activate one to deploy it to
            the kiosk.
          </p>
        </div>
        <a
          href="/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
        >
          <Plus className="size-4" />
          Create Theme
        </a>
      </div>

      {/* Active banner */}
      {activeLayout && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Check className="size-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-emerald-800">
              Active:{" "}
            </span>
            <span className="text-sm text-emerald-700">
              {activeLayout.name}
            </span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Live
          </Badge>
        </div>
      )}

      {activeLayout && (
        <Card className="rounded-2xl border-zinc-200 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Active theme statistics
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Session and print totals for{" "}
                <span className="font-medium text-zinc-700">
                  {activeLayout.name}
                </span>
                .
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={statisticsLoading}
              onClick={() => void refreshStatistics()}
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  statisticsLoading && "animate-spin",
                )}
              />
              Refresh statistics
            </Button>
          </div>
          {statisticsError && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              Unable to load statistics. Press refresh to try again.
            </p>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                <ScanLine className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950">
                  {activeThemeStatistics?.totalSessions ?? 0}
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  Total sessions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Printer className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950">
                  {activeThemeStatistics?.totalPrints ?? 0}
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  Total prints
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && layouts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-20 text-center">
          <Layers className="mb-3 size-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">
            No themes saved yet
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Create your first theme, customize the kiosk experience, then save
            it to this library.
          </p>
          <a
            href="/builder"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Create Theme
          </a>
        </div>
      )}

      {/* Theme cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {layouts.map((layout) => (
          <ThemeCard
            key={layout.id}
            layout={layout}
            isLoading={loadingId === layout.id}
            confirmingDelete={confirmDelete === layout.id}
            onActivate={() => setAssignModal(layout)}
            onDeactivate={() => void handleDeactivate(layout.id)}
            onRequestDelete={() => setConfirmDelete(layout.id)}
            onCancelDelete={() => setConfirmDelete(null)}
            onConfirmDelete={() => void handleDelete(layout.id)}
          />
        ))}
      </div>

      {/* Assign to devices modal */}
      {assignModal && (
        <AssignDevicesModal
          layout={assignModal}
          onClose={() => setAssignModal(null)}
          onDone={() => void handleActivateWithAssign(assignModal)}
        />
      )}
    </div>
  );
}

// ── ThemeCard ────────────────────────────────────────────────────────────────

interface ThemeCardProps {
  layout: LayoutSchemaRow;
  isLoading: boolean;
  confirmingDelete: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function ThemeCard({
  layout,
  isLoading,
  confirmingDelete,
  onActivate,
  onDeactivate,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: ThemeCardProps) {
  const isActive = layout.is_active;
  const [menuOpen, setMenuOpen] = useState(false);

  const nodeCount = Object.values(layout.schema?.pages ?? {}).reduce(
    (sum, pageNodes) => sum + (Array.isArray(pageNodes) ? pageNodes.length : 0),
    0,
  );
  const updatedAt = new Date(layout.updated_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border p-0 transition-all",
        isActive
          ? "border-emerald-300 shadow-emerald-100 shadow-md"
          : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm",
      )}
    >
      {/* Thumbnail preview */}
      <div className="relative bg-zinc-50 p-3 pb-0">
        <ThemeThumbnail schema={layout.schema} page="landing" />
        {isActive && (
          <Badge className="absolute right-4 top-4 shrink-0 bg-emerald-500 text-[10px] text-white shadow hover:bg-emerald-500">
            Active
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {layout.name}
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Updated {updatedAt} · {nodeCount} nodes ·{" "}
              {layout.schema?.canvas?.width ?? "–"}×
              {layout.schema?.canvas?.height ?? "–"}
            </p>
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-7 z-20 min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  {!isActive && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onActivate();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <Power className="size-3.5 text-emerald-600" /> Activate
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDeactivate();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <PowerOff className="size-3.5 text-orange-500" />{" "}
                      Deactivate
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div>
          <Badge
            variant={layout.status === "published" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {layout.status}
          </Badge>
        </div>

        {/* Delete confirmation inline */}
        {confirmingDelete ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <p className="mb-2 font-medium">Delete this theme?</p>
            <div className="flex gap-2">
              <button
                onClick={onConfirmDelete}
                disabled={isLoading}
                className="flex-1 rounded-md bg-red-600 py-1 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isLoading ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={onCancelDelete}
                className="flex-1 rounded-md border border-red-200 py-1 text-red-600 hover:bg-red-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Main action */
          <button
            onClick={isActive ? onDeactivate : onActivate}
            disabled={isLoading}
            className={cn(
              "mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50",
              isActive
                ? "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                : "bg-zinc-900 text-white hover:bg-zinc-700",
            )}
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isActive ? (
              <>
                <PowerOff className="size-3.5" /> Deactivate
              </>
            ) : (
              <>
                <Power className="size-3.5" /> Activate
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}
