"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FrameLayout, FrameNode } from "@/types/frame-template";
import type { PublicQueueTemplate } from "@/types/queue";

const DESKTOP_PAGE_SIZE = 9;

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getPhotoSlots(layout: FrameLayout | null) {
  if (!layout?.canvas || !Array.isArray(layout.nodes)) return [];
  return layout.nodes.filter((node) => node.type === "photo-slot");
}

function ScenicPhotoSlot({
  node,
  canvas,
}: {
  node: FrameNode;
  canvas: FrameLayout["canvas"];
}) {
  const left = (node.x / Math.max(1, canvas.width)) * 100;
  const top = (node.y / Math.max(1, canvas.height)) * 100;
  const width = (node.width / Math.max(1, canvas.width)) * 100;
  const height = (node.height / Math.max(1, canvas.height)) * 100;

  return (
    <div
      aria-hidden="true"
      className="absolute overflow-hidden bg-[linear-gradient(180deg,#c9ecff_0%,#eaf9ff_54%,#d7ef91_55%,#8cb400_77%,#5f9700_100%)]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        borderRadius: readNumber(node.props.radius, 0),
      }}
    >
      <div className="absolute left-[18%] top-[13%] h-[14%] w-[34%] rounded-full bg-white" />
      <div className="absolute left-[28%] top-[5%] size-[18%] rounded-full bg-white" />
      <div className="absolute left-[45%] top-[14%] size-[13%] rounded-full bg-white" />
      <div className="absolute inset-x-0 bottom-[23%] h-[30%] bg-[radial-gradient(90%_70%_at_22%_35%,#d7ef91_0%,#d7ef91_42%,transparent_43%),radial-gradient(95%_80%_at_70%_45%,#8cb400_0%,#8cb400_48%,transparent_49%)]" />
    </div>
  );
}

function FramePreview({ template }: { template: PublicQueueTemplate }) {
  const layout = template.frameLayout;
  const canvas = layout?.canvas ?? null;
  const photoSlots = getPhotoSlots(layout);

  return (
    <div className="relative grid h-full w-full place-items-center">
      {template.frameImageUrl ? (
        <div
          className="relative max-h-full max-w-full overflow-hidden drop-shadow-[0_10px_18px_rgba(24,24,27,0.22)]"
          style={{
            aspectRatio: canvas
              ? `${Math.max(1, canvas.width)} / ${Math.max(1, canvas.height)}`
              : "2 / 3",
            height: "100%",
          }}
        >
          {canvas
            ? photoSlots.map((node) => (
                <ScenicPhotoSlot
                  key={node.id}
                  node={node}
                  canvas={canvas}
                />
              ))
            : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={template.frameImageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 z-10 h-full w-full object-contain"
          />
        </div>
      ) : (
        <ImageIcon className="size-8 text-zinc-300" />
      )}
    </div>
  );
}

function FrameCard({ template }: { template: PublicQueueTemplate }) {
  return (
    <article className="flex h-[360px] w-[240px] flex-none flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white sm:h-[390px] sm:w-[280px] lg:w-full">
      <div className="grid h-[240px] shrink-0 place-items-center overflow-hidden border-b border-zinc-200 bg-zinc-50 px-6 py-7 sm:h-[260px] sm:px-8">
        <FramePreview template={template} />
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
