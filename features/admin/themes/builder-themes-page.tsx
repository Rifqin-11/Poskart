"use client";

import Link from "next/link";
import { useState } from "react";
import { showErrorToast, toast } from "@/lib/toast";
import {
  Check,
  Copy,
  Layers,
  Palette,
  Lightbulb,
  Loader2,
  MoreVertical,
  Monitor,
  Pencil,
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
import {
  DeviceStatusBadge,
  getDeviceStatusMeta,
} from "@/components/ui/device-status-badge";
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
import {
  useBooths,
  useUpdateBooth,
} from "@/features/admin/devices/use-devices";
import type { LayoutSchemaRow } from "@/features/admin/layout/api";
import { cn } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { THEME_BRAINSTORM_PROMPT } from "@/features/admin/themes/theme-brainstorm-prompt";
import { GalleryBrandingPage } from "@/features/admin/themes/components/gallery-branding-page";

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

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Assign to Devices
            </h2>
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
                  {selected.size === devices.length
                    ? "Deselect all"
                    : "Select all"}
                </span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {devices.length}
                </Badge>
              </button>
              {devices.map((device) => {
                const isSelected = selected.has(device.id);
                const hasCurrentTheme = device.layoutSchemaId === layout.id;
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
                        isSelected
                          ? "border-zinc-900 bg-zinc-900"
                          : "border-zinc-300",
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
                          getDeviceStatusMeta(device.status).dotClassName,
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
                        {device.location} ·{" "}
                        {device.theme || "no theme assigned"}
                      </p>
                    </div>
                    {/* Status badge */}
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
            {activating
              ? "Assigning…"
              : `Assign${selected.size > 0 ? ` to ${selected.size} device${selected.size > 1 ? "s" : ""}` : ""}`}
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
          updateBooth.mutateAsync({
            id: deviceId,
            patch: { theme: layout.name },
          }),
        ),
      );
      toast.success(
        selected.size > 0
          ? `Theme "${layout.name}" assigned to ${selected.size} device${selected.size > 1 ? "s" : ""}.`
          : `Theme "${layout.name}" assigned as the active theme.`,
      );
      onDone();
    } catch (err) {
      showErrorToast("Tidak dapat menerapkan theme", err, "Theme belum diterapkan ke device.");
    } finally {
      setActivating(false);
    }
  }
}

// ── BuilderThemesPage ────────────────────────────────────────────────────────

export function BuilderThemesPage() {
  const { t } = useI18n();
  const { isReadOnly } = usePermission();
  const { data: layouts = [], isLoading } = useLayoutSchemas();
  const setActive = useSetActiveLayout();
  const deactivate = useDeactivateLayout();
  const deleteLayout = useDeleteLayout();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  /** Layout pending activation — opens the assign-to-devices modal */
  const [assignModal, setAssignModal] = useState<LayoutSchemaRow | null>(null);
  const [activeTab, setActiveTab] = useState<"ui" | "gallery">("ui");

  const activeLayout = layouts.find((l) => l.is_active);
  const {
    data: activeThemeStatistics,
    isFetching: statisticsLoading,
    isError: statisticsError,
    refetch: refreshStatistics,
  } = useActiveThemeStatistics(activeLayout?.name ?? null);

  /** Copy the ready-made AI brainstorming prompt to the clipboard */
  const handleCopyPrompt = () => {
    void navigator.clipboard
      .writeText(THEME_BRAINSTORM_PROMPT)
      .then(() =>
        toast.success(
          "Prompt disalin! Paste ke Lovable/Stitch untuk brainstorming tema.",
        ),
      )
      .catch(() => toast.error("Gagal menyalin prompt"));
  };

  /** Activate theme in DB (sets is_active = true) */
  const handleActivate = async (id: string) => {
    setLoadingId(id);
    try {
      await setActive.mutateAsync(id);
    } catch (err) {
      showErrorToast(
        "Theme activation failed",
        err,
        "The theme could not be activated. Please try again.",
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
      showErrorToast(
        "Theme deactivation failed",
        err,
        "The theme could not be deactivated. Please try again.",
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
      showErrorToast(
        "Theme deletion failed",
        err,
        "The theme could not be deleted. Please try again.",
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Builder Themes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Layouts saved from the Visual Builder. Assign one to deploy it to
            the kiosk.
          </p>
        </div>
        {!isReadOnly("themes") && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <Copy className="size-4" />
              Copy Prompt
            </button>
            <Link
              href="/themes/builder/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#00357B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014EB4]"
            >
              <Plus className="size-4" />
              Create Theme
            </Link>
          </div>
        )}
      </div>

      {/* Copy Prompt explanation */}
      {/* <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-sm leading-6 text-amber-800">
          <span className="font-semibold">Copy Prompt</span> menyalin prompt
          siap pakai untuk brainstorming desain tema di AI tools seperti
          Lovable atau Stitch. Prompt tersebut sudah menjelaskan semua halaman
          kiosk (Landing, Tutorial, Frame Picker, Camera, Preview, Thanks)
          beserta fungsinya dan node apa saja yang tersedia — jadi Anda tidak
          perlu menjelaskan ulang setiap kali. Cukup paste, lalu isi mood/gaya
          tema yang diinginkan.
        </p>
      </div> */}

      {/* Active banner
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
      )} */}

      <nav className="flex items-stretch gap-2">
      <div
        role="tablist"
        className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ui"}
          data-themes-tab="ui"
          onClick={() => setActiveTab("ui")}
          className={cn(
            "flex min-w-[150px] flex-1 shrink-0 items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]/20",
            activeTab === "ui"
              ? "bg-white text-zinc-950 shadow-sm hover:bg-white"
              : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900",
          )}
        >
          UI
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "gallery"}
          data-themes-tab="gallery"
          onClick={() => setActiveTab("gallery")}
          className={cn(
            "flex min-w-[150px] flex-1 shrink-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]/20",
            activeTab === "gallery"
              ? "bg-white text-zinc-950 shadow-sm hover:bg-white"
              : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900",
          )}
        >
          <Palette className="size-4" /> Gallery branding
        </button>
      </div>
      </nav>

      {activeTab === "gallery" ? <GalleryBrandingPage /> : null}

      {activeTab === "ui" && (
      <>
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-zinc-400" />
        </div>
      )}

      {!isLoading && layouts.length === 0 && (
        <div className="relative overflow-hidden rounded-4xl border border-blue-100 bg-[#f7f9ff] px-6 py-16 text-center sm:px-10">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="relative mx-auto max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-[#00357B] shadow-sm ring-1 ring-blue-100">
              <Layers className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">
              Belum ada tema tersimpan
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Buat tema pertama Anda untuk mengatur tampilan kiosk — warna, font, dan layout — lalu simpan ke library ini.
            </p>
            {!isReadOnly("themes") && (
              <Link
                href="/themes/builder/new"
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                <Plus className="size-4" /> Buat tema
              </Link>
            )}
          </div>
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
            onAssign={() => setAssignModal(layout)}
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
      </>
      )}
    </div>
  );
}

// ── ThemeCard ────────────────────────────────────────────────────────────────

interface ThemeCardProps {
  layout: LayoutSchemaRow;
  isLoading: boolean;
  confirmingDelete: boolean;
  onAssign: () => void;
  onDeactivate: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function ThemeCard({
  layout,
  isLoading,
  confirmingDelete,
  onAssign,
  onDeactivate,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: ThemeCardProps) {
  const { t } = useI18n();
  const { isReadOnly } = usePermission();
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
          {!isReadOnly("themes") && (
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
                    <Link
                      href={`/themes/builder/${layout.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                    {!isActive && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onAssign();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <Monitor className="size-3.5 text-emerald-600" /> Assign
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
          )}
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
          /* Main actions */
          <div className="mt-auto grid grid-cols-2 gap-2">
            {!isReadOnly("themes") && (
              <Link
                href={`/themes/builder/${layout.id}`}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Pencil className="size-3.5" /> Edit
              </Link>
            )}
            <button
              onClick={isActive ? onDeactivate : onAssign}
              disabled={isLoading || isReadOnly("themes")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                isReadOnly("themes") && "col-span-2",
                isActive
                  ? "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  : "bg-zinc-900 text-white hover:bg-zinc-700",
              )}
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isActive ? (
                <>
                  <PowerOff className="size-3.5" /> {t("themes.deactivate")}
                </>
              ) : (
                <>
                  <Monitor className="size-3.5" /> {t("themes.assign")}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
