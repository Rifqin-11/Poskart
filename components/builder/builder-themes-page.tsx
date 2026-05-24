"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ExternalLink,
  Layers,
  Loader2,
  MoreVertical,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeThumbnail } from "@/components/builder/theme-thumbnail";
import {
  useLayoutSchemas,
  useSetActiveLayout,
  useDeactivateLayout,
  useDeleteLayout,
} from "@/hooks/use-admin-data";
import type { LayoutSchemaRow } from "@/lib/services/admin-service";
import { cn } from "@/lib/utils";

export function BuilderThemesPage() {
  const { data: layouts = [], isLoading, refetch } = useLayoutSchemas();
  const setActive = useSetActiveLayout();
  const deactivate = useDeactivateLayout();
  const deleteLayout = useDeleteLayout();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const activeLayout = layouts.find((l) => l.is_active);

  const handleActivate = async (id: string) => {
    setLoadingId(id);
    try {
      await setActive.mutateAsync(id);
      toast.success("Theme activated — kiosk will use this layout.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to activate theme",
      );
    } finally {
      setLoadingId(null);
    }
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
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Layers className="size-4" />
          Open Builder
          <ExternalLink className="size-3 text-zinc-400" />
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
            Open the Visual Builder and click <strong>Save theme</strong> to
            create your first layout.
          </p>
          <a
            href="/builder"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Open Builder
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
            onActivate={() => void handleActivate(layout.id)}
            onDeactivate={() => void handleDeactivate(layout.id)}
            onRequestDelete={() => setConfirmDelete(layout.id)}
            onCancelDelete={() => setConfirmDelete(null)}
            onConfirmDelete={() => void handleDelete(layout.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── ThemeCard ────────────────────────────────────────────────

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
