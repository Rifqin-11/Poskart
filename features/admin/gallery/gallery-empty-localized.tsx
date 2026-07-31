"use client";

import { useI18n } from "@/lib/i18n/i18n-provider";
import { Images } from "lucide-react";
import { Card } from "@/components/ui/card";
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
      <Card
        data-gallery-tour="empty"
        className="grid min-h-80 place-items-center rounded-2xl border-dashed p-10 text-center"
      >
        <div>
          <Images className="mx-auto size-10 text-zinc-400" />
          <p className="mt-4 max-w-md text-sm text-zinc-500">{message}</p>
        </div>
      </Card>
    </div>
  );
}
