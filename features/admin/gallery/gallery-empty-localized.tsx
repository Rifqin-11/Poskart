"use client";

import { useI18n } from "@/lib/i18n/i18n-provider";
import { Images } from "lucide-react";
import {
  GalleryShareHeaderActions,
} from "@/features/admin/gallery/gallery-share-manager";

export function GalleryEmptyLocalized({ noOrg }: { noOrg?: boolean }) {
  const { t } = useI18n();
  const message = t(noOrg ? "gallery.noOrg" : "gallery.empty");
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Gallery
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Hasil raw dan framed photo dari kiosk.
          </p>
        </div>
        <GalleryShareHeaderActions />
      </header>
      <div
        data-gallery-tour="empty"
        className="relative overflow-hidden rounded-4xl border border-blue-100 bg-[#f7f9ff] px-6 py-16 text-center sm:px-10"
      >
        <div className="absolute -right-20 -top-24 size-64 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative mx-auto max-w-lg">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-[#00357B] shadow-sm ring-1 ring-blue-100">
            <Images className="size-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">
            Belum ada foto di galeri
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{message}</p>
        </div>
      </div>
    </div>
  );
}
