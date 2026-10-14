"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Mail, PackageOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getGalleryExperience, updateGalleryExperience, type GalleryUnboxingStyle } from "@/server/admin/actions/gallery-experience-actions";
import { showErrorToast, toast } from "@/lib/toast";

export function GalleryExperience() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["gallery-experience"],
    queryFn: getGalleryExperience,
    enabled: open,
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

  return <>
    <Button type="button" variant="outline" onClick={() => setOpen(true)}>
      <Sparkles className="size-4" /> Experience
    </Button>
    <Dialog open={open} onOpenChange={setOpen} title="Gallery Experience" className="max-w-lg">
      <p className="mb-5 text-sm leading-6 text-zinc-500">Atur pengalaman pengunjung saat membuka hasil foto. Berlaku untuk seluruh galeri organisasi, termasuk tautan yang sudah dibagikan.</p>
      {query.isPending ? <div className="flex items-center gap-2 py-5 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Memuat experience…</div> : query.isError ? <div className="space-y-3"><p role="alert" className="text-sm text-red-600">Experience galeri belum dapat dimuat.</p><Button variant="outline" onClick={() => void query.refetch()}>Coba lagi</Button></div> : <>
        <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100"><PackageOpen className="size-5 text-zinc-600" /></span>
          <div className="min-w-0 flex-1">
            <label id="gallery-unboxing-label" className="text-sm font-semibold text-zinc-950">Unboxing</label>
            <p id="gallery-unboxing-description" className="mt-1 text-xs leading-5 text-zinc-500">Berikan pengalaman membuka paket foto sebelum masuk ke galeri.</p>
            <p className="mt-2 text-xs font-medium text-zinc-700" aria-live="polite">{update.isPending ? "Menyimpan…" : query.data.unboxingEnabled ? `Aktif · ${query.data.unboxingStyle === "envelope" ? "amplop" : "packaging"}` : "Nonaktif · pengunjung langsung melihat foto"}</p>
          </div>
          <Switch checked={query.data.unboxingEnabled} disabled={!query.data.canEdit || update.isPending || query.isFetching} aria-labelledby="gallery-unboxing-label" aria-describedby="gallery-unboxing-description" onCheckedChange={(enabled) => update.mutate({ enabled, style: query.data.unboxingStyle as GalleryUnboxingStyle })} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Pilih gaya unboxing">
          {(["packaging", "envelope"] as GalleryUnboxingStyle[]).map((style) => {
            const selected = query.data.unboxingStyle === style;
            return <button key={style} type="button" disabled={!query.data.canEdit || update.isPending || query.isFetching} onClick={() => update.mutate({ enabled: query.data.unboxingEnabled, style })} className={`group rounded-2xl border p-3 text-left transition ${selected ? "border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950" : "border-zinc-200 hover:border-zinc-400"}`}>
              <div className="flex items-center justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-100">{style === "envelope" ? <Mail className="size-4" /> : <PackageOpen className="size-4" />}</span>{selected && <Check className="size-4 text-zinc-950" />}</div>
              <p className="mt-3 text-sm font-semibold text-zinc-950">{style === "envelope" ? "Amplop" : "Packaging"}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{style === "envelope" ? "Kartu foto muncul dari amplop stationery." : "Paket foto dibuka dengan menarik seal."}</p>
            </button>;
          })}
        </div>
        {!query.data.canEdit && <p className="mt-3 text-xs text-zinc-500">Hanya owner atau admin yang dapat mengubah experience galeri.</p>}
      </>}
    </Dialog>
  </>;
}
