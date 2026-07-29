"use client";

import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { pageLabels } from "@/features/builder/constants";
import { cn } from "@/lib/utils";
import type { BuilderCanvas, BuilderPage } from "@/types/builder";

export function VisualPageTabs({
  activePage,
  canvas,
  onSetActivePage,
  onUpdateCanvas,
  compact = false,
}: {
  activePage: BuilderPage;
  canvas: BuilderCanvas;
  onSetActivePage: (page: BuilderPage) => void;
  onUpdateCanvas: (patch: Partial<BuilderCanvas>) => void;
  compact?: boolean;
}) {
  const isActivePageEnabled =
    !canvas.enabledPages || canvas.enabledPages.includes(activePage);

  const togglePage = (page: BuilderPage) => {
    const allPages = pageLabels;
    const currentPages = canvas.enabledPages ?? allPages;
    const isEnabled = currentPages.includes(page);
    const nextPages = isEnabled
      ? currentPages.filter((item) => item !== page)
      : [...currentPages, page];
    onUpdateCanvas({
      enabledPages:
        nextPages.length === allPages.length ? undefined : nextPages,
    });
  };

  if (compact) {
    return (
      <div
        data-builder-tour="pages"
        className="flex min-w-0 items-center gap-1 rounded-lg bg-zinc-100 p-0.5"
      >
        <label className="relative flex h-8 min-w-0 items-center gap-1.5 rounded-md bg-white px-2 shadow-sm">
          <span className="hidden text-[10px] font-medium text-zinc-400 sm:inline">
            Page
          </span>
          <select
            value={activePage}
            aria-label="Active builder page"
            onChange={(event) =>
              onSetActivePage(event.target.value as BuilderPage)
            }
            className="min-w-0 max-w-28 appearance-none bg-transparent pr-5 text-xs font-semibold capitalize text-zinc-900 outline-none"
          >
            {pageLabels.map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-zinc-400" />
        </label>
        <button
          type="button"
          title={
            isActivePageEnabled
              ? `Sembunyikan halaman (${activePage}) dari alur kiosk`
              : `Tampilkan halaman (${activePage}) di alur kiosk`
          }
          aria-label={
            isActivePageEnabled
              ? `Hide ${activePage} page`
              : `Show ${activePage} page`
          }
          onClick={() => togglePage(activePage)}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-md transition-colors",
            isActivePageEnabled
              ? "text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900"
              : "bg-amber-100 text-amber-700",
          )}
        >
          {isActivePageEnabled ? (
            <Eye className="size-3.5" />
          ) : (
            <EyeOff className="size-3.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      data-builder-tour="pages"
      className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5"
    >
      {pageLabels.map((page) => {
        const isEnabled =
          !canvas.enabledPages || canvas.enabledPages.includes(page);
        const isActive = activePage === page;

        return (
          <div
            key={page}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-all",
              isActive
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
              !isEnabled && "opacity-75",
            )}
          >
            <button
              type="button"
              onClick={() => onSetActivePage(page)}
              className="min-w-0 font-medium tracking-tight outline-none"
            >
              <span
                className={cn(
                  !isEnabled &&
                    "line-through text-zinc-400 decoration-zinc-400/60",
                )}
              >
                {page}
              </span>
            </button>

            <button
              type="button"
              title={
                isEnabled
                  ? `Sembunyikan halaman (${page}) dari alur kiosk`
                  : `Tampilkan halaman (${page}) di alur kiosk`
              }
              onClick={(event) => {
                event.stopPropagation();
                togglePage(page);
              }}
              className={cn(
                "grid size-4 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400",
                isEnabled
                  ? "text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-800"
                  : "bg-amber-100/80 text-amber-700 hover:bg-amber-200 hover:text-amber-800",
              )}
            >
              {isEnabled ? (
                <Eye className="size-3" />
              ) : (
                <EyeOff className="size-3" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
