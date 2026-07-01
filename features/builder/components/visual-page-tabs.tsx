"use client";

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
    <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5">
      {pageLabels.map((page) => {
        const isEnabled =
          !canvas.enabledPages || canvas.enabledPages.includes(page);
        return (
          <div key={page} className="group relative">
            <button
              type="button"
              onClick={() => onSetActivePage(page)}
              className={cn(
                "rounded-md px-3 py-1 text-[11px] font-medium capitalize transition-colors",
                activePage === page
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
                !isEnabled && "opacity-40",
              )}
            >
              {page}
              {!isEnabled && (
                <span className="ml-1 text-[9px] text-zinc-400">(off)</span>
              )}
            </button>
            <button
              type="button"
              title={isEnabled ? "Disable page on tablet" : "Enable page on tablet"}
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
              className="absolute -right-1 -top-1 hidden size-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-[8px] text-zinc-500 shadow-sm hover:border-zinc-500 hover:text-zinc-900 group-hover:flex group-focus-within:flex [@media(pointer:coarse)]:flex"
            >
              {isEnabled ? "●" : "○"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
