"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Check, Loader2, Mail, PackageOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getGalleryExperience, updateGalleryExperience, type GalleryUnboxingStyle } from "@/server/admin/actions/gallery-experience-actions";
import { showErrorToast, toast } from "@/lib/toast";

const UNBOXING_STYLES: {
  style: GalleryUnboxingStyle;
  label: string;
  description: string;
  image: string;
  alt: string;
}[] = [
  {
    style: "packaging",
    label: "Packaging",
    description: "Paket foto dibuka dengan menarik seal.",
    image: "/landing/gallery-pouch-navy.webp",
    alt: "Contoh packaging foto POSKART berwarna biru navy",
  },
  {
    style: "envelope",
    label: "Amplop",
    description: "Kartu foto muncul dari amplop stationery.",
    image: "/landing/gallery-envelope-closed.webp",
    alt: "Contoh amplop kertas dengan segel untuk photo unboxing",
  },
];

export function GalleryExperience() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["gallery-experience"],
    queryFn: getGalleryExperience,
    staleTime: 0,
  });
  const update = useMutation({
    mutationFn: updateGalleryExperience,
    onSuccess: (data) => {
      queryClient.setQueryData(["gallery-experience"], data);
      toast.success("Experience galeri berhasil disimpan.");
    },
    onError: (error) => showErrorToast("Tidak dapat menyimpan experience", error, "Perubahan belum tersimpan. Coba lagi."),
  });
  const selectedStyle =
    UNBOXING_STYLES.find((item) => item.style === query.data?.unboxingStyle) ??
    UNBOXING_STYLES[0];

  return <>
    <Card className="w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 bg-white sm:aspect-auto sm:min-h-[280px] sm:w-[280px] lg:w-[340px]">
          <Image
            src={selectedStyle.image}
            alt={selectedStyle.alt}
            fill
            sizes="(max-width: 640px) 100vw, 340px"
            className="object-contain p-4"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-8 border-t border-zinc-200 p-5 sm:border-l sm:border-t-0 sm:p-7">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Badge>{t("nav.gallery")}</Badge>
              <span className="text-xs font-medium text-zinc-500">
                {selectedStyle.label}
              </span>
            </div>
            <CardTitle className="text-xl tracking-tight">Photo Unboxing</CardTitle>
            <CardDescription className="mt-2 max-w-xl leading-6">
              {t("experience.galleryDescription")}
            </CardDescription>
            <p className="mt-2 text-sm leading-5 text-zinc-600">
              {selectedStyle.description}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-4 sm:justify-start">
              <div>
                <p id="gallery-unboxing-label" className="text-sm font-semibold text-zinc-900">
                  Photo Unboxing
                </p>
                <p id="gallery-unboxing-description" className="mt-1 text-xs text-zinc-500" aria-live="polite">
                  {query.isPending ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" /> Memuat status…
                    </span>
                  ) : query.isError ? (
                    <span role="alert">Status belum dapat dimuat.</span>
                  ) : query.data.unboxingEnabled ? (
                    "Aktif — pengalaman unboxing ditampilkan di galeri."
                  ) : (
                    "Nonaktif — pengunjung langsung melihat foto."
                  )}
                </p>
              </div>
              <Switch
                checked={query.data?.unboxingEnabled ?? false}
                disabled={!query.data?.canEdit || update.isPending || query.isFetching || query.isError}
                aria-label="Aktifkan photo unboxing"
                aria-describedby="gallery-unboxing-description"
                onCheckedChange={(enabled) =>
                  update.mutate({ enabled, style: selectedStyle.style })
                }
              />
            </div>

            <Button type="button" variant="outline" onClick={() => setOpen(true)}>
              <Sparkles className="size-4" /> {t("experience.configure")}
            </Button>
          </div>
        </div>
      </div>
    </Card>
    <Dialog open={open} onOpenChange={setOpen} title="Gallery Experience" className="max-w-lg">
      <p className="mb-5 text-sm leading-6 text-zinc-500">Atur pengalaman pengunjung saat membuka hasil foto. Berlaku untuk seluruh galeri organisasi, termasuk tautan yang sudah dibagikan.</p>
      {query.isPending ? <div className="flex items-center gap-2 py-5 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Memuat experience…</div> : query.isError ? <div className="space-y-3"><p role="alert" className="text-sm text-red-600">Experience galeri belum dapat dimuat.</p><Button variant="outline" onClick={() => void query.refetch()}>Coba lagi</Button></div> : <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Pilih gaya unboxing">
          {UNBOXING_STYLES.map((item) => {
            const selected = query.data.unboxingStyle === item.style;
            return (
              <button
                key={item.style}
                type="button"
                aria-pressed={selected}
                disabled={!query.data.canEdit || update.isPending || query.isFetching}
                onClick={() => update.mutate({ enabled: query.data.unboxingEnabled, style: item.style })}
                className={`group overflow-hidden rounded-2xl border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00357B] disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-[#00357B]/60 ring-1 ring-[#00357B]/20"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <div className="relative aspect-[4/3] bg-white">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="border-t border-zinc-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                      <span className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                        {item.style === "envelope" ? (
                          <Mail className="size-4" />
                        ) : (
                          <PackageOpen className="size-4" />
                        )}
                      </span>
                      {item.label}
                    </span>
                    {selected && <Check className="size-4 shrink-0 text-[#00357B]" />}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {!query.data.canEdit && <p className="mt-3 text-xs text-zinc-500">Hanya owner atau admin yang dapat mengubah experience galeri.</p>}
      </>}
    </Dialog>
  </>;
}
