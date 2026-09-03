"use client";

import Link from "next/link";
import { useState } from "react";
import { showErrorToast, toast } from "@/lib/toast";
import {
  AlertTriangle,
  Check,
  Copy,
  Layers,
  Palette,
  Lightbulb,
  Loader2,
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
import { Dialog } from "@/components/ui/dialog";
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
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
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
  const { t } = useI18n();
  useScrollLock(true);

  const translate = (key: Parameters<typeof t>[0], values: Record<string, string>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      t(key),
    );
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
              {t("themes.assignTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {t("themes.assignDesc").replace("{name}", layout.name)}
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
              <p className="text-sm text-zinc-500">{t("themes.noDevices")}</p>
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
                    ? t("themes.deselectAll")
                    : t("themes.selectAll")}
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
                            {t("themes.current")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                        {device.location} · {device.theme || t("themes.noTheme")}
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
            {t("themes.cancel")}
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
              ? t("themes.assigning")
              : selected.size > 0
                ? translate("themes.assignTo", { count: String(selected.size) })
                : t("themes.createWithoutAssignment")}
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
          ? translate("themes.themeAssigned", {
              name: layout.name,
              count: String(selected.size),
              devices: selected.size > 1 ? t("themes.devicesCount") : t("themes.deviceCount"),
            })
          : translate("themes.themeAssignedActive", { name: layout.name }),
      );
      onDone();
    } catch (err) {
      showErrorToast(
        t("themes.activationFailed"),
        err,
        t("themes.themeApplyFailed"),
      );
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
          "Prompt berhasil disalin. Tempelkan ke Lovable atau Stitch untuk mencari inspirasi tema.",
        ),
      )
      .catch(() => toast.error("Prompt tidak dapat disalin."));
  };

  /** Activate theme in DB (sets is_active = true) */
  const handleActivate = async (id: string) => {
    setLoadingId(id);
    try {
      await setActive.mutateAsync(id);
    } catch (err) {
      showErrorToast(
        t("themes.activationFailed"),
        err,
        t("themes.activationError"),
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
      toast.success(t("themes.deactivated"));
    } catch (err) {
      showErrorToast(
        t("themes.deactivationFailed"),
        err,
        t("themes.deactivationError"),
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
      toast.success(t("themes.deleted"));
    } catch (err) {
      showErrorToast(
        t("themes.deletionFailed"),
        err,
        t("themes.deletionError"),
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
            {t("themes.pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("themes.pageDesc")}
          </p>
        </div>
        {!isReadOnly("themes") && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <Copy className="size-4" />
              {t("themes.copyPrompt")}
            </button>
            <Link
              href="/themes/builder/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#00357B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014EB4]"
            >
              <Plus className="size-4" />
              {t("themes.createTheme")}
            </Link>
          </div>
        )}
      </div>

      {/* Penjelasan salin prompt */}
      {/* <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-sm leading-6 text-amber-800">
           <span className="font-semibold">Salin prompt</span> menyalin prompt
           siap pakai untuk mencari inspirasi desain tema menggunakan alat AI
           seperti Lovable atau Stitch. Prompt tersebut menjelaskan halaman
           kiosk dan komponen yang tersedia, sehingga Anda tidak perlu
           menjelaskan ulang setiap kali. Cukup tempelkan prompt, lalu isi gaya
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
          <Palette className="size-4" /> {t("themes.galleryBranding")}
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
             {t("themes.active")}
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
              {t("themes.updatedNodes")
                .replace("{date}", updatedAt)
                .replace("{count}", String(nodeCount))
                .replace("{width}", String(layout.schema?.canvas?.width ?? "–"))
                .replace("{height}", String(layout.schema?.canvas?.height ?? "–"))}
            </p>
          </div>

          {/* Delete button */}
          {!isReadOnly("themes") && (
            <button
              type="button"
              onClick={onRequestDelete}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={t("themes.deleteThis")}
            >
              <Trash2 className="size-4" />
            </button>
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

        {/* Main actions */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          {!isReadOnly("themes") && (
            <Link
              href={`/themes/builder/${layout.id}`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
               <Pencil className="size-3.5" /> {t("themes.edit")}
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
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmingDelete}
        onOpenChange={(nextOpen) => {
          if (nextOpen) onRequestDelete();
          else onCancelDelete();
        }}
        title={t("themes.deleteThis")}
        className="max-w-md rounded-2xl"
        overlayClassName="z-[90]"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <p className="text-sm leading-6 text-red-900">
              {t("themes.deleteDesc").replace("{name}", layout.name)}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={isLoading}
              onClick={onCancelDelete}
            >
              {t("themes.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={isLoading}
              onClick={onConfirmDelete}
            >
              <Trash2 className="size-4" />
              {isLoading ? t("themes.deleting") : t("themes.yesDelete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
