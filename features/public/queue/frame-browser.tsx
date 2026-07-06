"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicQueueTemplate } from "@/types/queue";

const DESKTOP_PAGE_SIZE = 9;

function FrameCard({ template }: { template: PublicQueueTemplate }) {
  return (
    <article className="flex h-[360px] w-[240px] flex-none flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white sm:h-[390px] sm:w-[280px] lg:w-full">
      <div className="grid h-[240px] shrink-0 place-items-center border-b border-zinc-200 bg-zinc-50 sm:h-[260px]">
        {template.frameImageUrl ? (
          <div className="relative h-[210px] w-[168px] sm:h-[228px] sm:w-[184px]">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-xl bg-[linear-gradient(180deg,#c9ecff_0%,#eaf9ff_52%,#d7ef91_53%,#8cb400_74%,#5f9700_100%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-[20%] h-[26%] bg-[radial-gradient(90%_70%_at_22%_35%,#d7ef91_0%,#d7ef91_42%,transparent_43%),radial-gradient(95%_80%_at_70%_45%,#8cb400_0%,#8cb400_48%,transparent_49%)]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.frameImageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(24,24,27,0.22)]"
            />
          </div>
        ) : (
          <ImageIcon className="size-8 text-zinc-300" />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center p-4">
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
