"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicQueueTemplate } from "@/types/queue";

const DESKTOP_PAGE_SIZE = 9;

function FrameCard({ template }: { template: PublicQueueTemplate }) {
  return (
    <article className="min-w-[240px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 sm:min-w-[280px] lg:min-w-0">
      <div className="grid aspect-[4/3] place-items-center bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] p-3">
        {template.frameImageUrl ? (
          <div
            aria-hidden="true"
            className="h-full w-full rounded-xl border border-zinc-200 bg-white bg-contain bg-center bg-no-repeat shadow-sm"
            style={{
              backgroundImage: `url(${template.frameImageUrl})`,
            }}
          />
        ) : (
          <ImageIcon className="size-8 text-zinc-300" />
        )}
      </div>
      <div className="p-4">
        <div className="truncate font-semibold">{template.name}</div>
        <div className="mt-1 text-xs text-zinc-500">
          {template.photoCount} photo
          {template.photoCount > 1 ? "s" : ""}
          {template.tagline ? ` · ${template.tagline}` : ""}
        </div>
      </div>
    </article>
  );
}

export function FrameBrowser({
  templates,
}: {
  templates: PublicQueueTemplate[];
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(templates.length / DESKTOP_PAGE_SIZE));
  const visibleTemplates = useMemo(
    () =>
      templates.slice(
        page * DESKTOP_PAGE_SIZE,
        page * DESKTOP_PAGE_SIZE + DESKTOP_PAGE_SIZE,
      ),
    [page, templates],
  );

  if (templates.length === 0) {
    return (
      <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
        <div>
          <ImageIcon className="mx-auto size-9 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-500">
            Frames are being prepared
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:hidden">
        {templates.map((template) => (
          <div key={template.id} className="snap-start">
            <FrameCard template={template} />
          </div>
        ))}
      </div>

      <div className="relative mt-5 hidden lg:block">
        <div className="grid gap-4 lg:grid-cols-3">
          {visibleTemplates.map((template) => (
            <FrameCard key={template.id} template={template} />
          ))}
        </div>

        {pageCount > 1 ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              aria-label="Previous frames"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-sm"
              disabled={page >= pageCount - 1}
              onClick={() =>
                setPage((current) => Math.min(pageCount - 1, current + 1))
              }
              aria-label="Next frames"
            >
              <ChevronRight className="size-4" />
            </Button>
          </>
        ) : null}

        <div className="mt-4 text-center text-xs text-zinc-400">
          Page {page + 1} of {pageCount}
        </div>
      </div>
    </>
  );
}
