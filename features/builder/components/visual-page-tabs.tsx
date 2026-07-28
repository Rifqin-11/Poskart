"use client";

import { Eye, EyeOff } from "lucide-react";
import { pageLabels } from "@/features/builder/constants";
import { cn } from "@/lib/utils";
import type { BuilderCanvas, BuilderPage } from "@/types/builder";

export function VisualPageTabs({
  activePage,
  canvas,
  onSetActivePage,
  onUpdateCanvas,
}: {
  activePage: BuilderPage;
  canvas: BuilderCanvas;
  onSetActivePage: (page: BuilderPage) => void;
  onUpdateCanvas: (patch: Partial<BuilderCanvas>) => void;
}) {
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
                  !isEnabled && "line-through text-zinc-400 decoration-zinc-400/60",
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
                const allPages = pageLabels;
                const currentPages = canvas.enabledPages ?? allPages;
                const nextPages = isEnabled
                  ? currentPages.filter((item) => item !== page)
                  : [...currentPages, page];
                onUpdateCanvas({
                  enabledPages:
                    nextPages.length === allPages.length
                      ? undefined
                      : nextPages,
                });
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
