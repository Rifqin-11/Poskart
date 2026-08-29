"use client";

import { useState } from "react";
import { ImagePlus, Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showErrorToast, toast } from "@/lib/toast";
import {
  DEFAULT_GALLERY_BRANDING,
  normalizeGalleryBranding,
  type GalleryBrandingOverrides,
} from "@/lib/gallery/branding";
import {
  useGalleryBranding,
  useUpdateOrganizationGalleryBranding,
} from "@/features/admin/layout/use-layout";
import {
  getBuilderImageValidationError,
  uploadBuilderImage,
} from "@/lib/services/storage-service";

type BrandingDraft = {
  brandName: string;
  logoUrl: string;
  subtitle: string;
  footerText: string;
};

function toDraft(value: unknown): BrandingDraft {
  const branding = normalizeGalleryBranding(value);
  return {
    brandName: branding.brandName,
    logoUrl: branding.logoUrl,
    subtitle: branding.subtitle,
    footerText: branding.footerText,
  };
}

export function GalleryBrandingPage() {
  const brandingQuery = useGalleryBranding();
  const updateBranding = useUpdateOrganizationGalleryBranding();
  const [draftOverrides, setDraftOverrides] = useState<Partial<BrandingDraft>>({});
  const [uploading, setUploading] = useState(false);
  const draft = {
    ...toDraft(brandingQuery.data),
    ...draftOverrides,
  };

  const update = (patch: Partial<BrandingDraft>) =>
    setDraftOverrides((current) => ({ ...current, ...patch }));

  const handleLogo = async (file: File) => {
    const validationError = getBuilderImageValidationError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setUploading(true);
    try {
      const result = await uploadBuilderImage(file);
      update({ logoUrl: result.url });
    } catch (error) {
      showErrorToast(
        "Tidak dapat mengunggah logo",
        error,
        "Logo belum berhasil diunggah.",
      );
    } finally {
      setUploading(false);
    }
  };

  const reset = () => setDraftOverrides(toDraft(DEFAULT_GALLERY_BRANDING));

  const save = async () => {
    if (!draft.brandName.trim()) {
      toast.error("Nama bisnis wajib diisi.");
      return;
    }
    try {
      await updateBranding.mutateAsync(draft satisfies GalleryBrandingOverrides);
      toast.success("Gallery branding tersimpan.");
    } catch (error) {
      showErrorToast(
        "Tidak dapat menyimpan gallery branding",
        error,
        "Perubahan branding belum tersimpan. Coba lagi.",
      );
    }
  };

  if (brandingQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white py-24">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const copyright = `© ${new Date().getFullYear()} ${draft.brandName}. All rights reserved.`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.75fr)_minmax(520px,1.25fr)]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-zinc-900">Gallery branding</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Branding global yang tampil pada semua halaman hasil gallery organisasi ini. Layout gallery dan Contact Support tetap milik POSKART.
          </p>
        </div>
        <div className="space-y-4">
          <label className="block text-xs font-medium text-zinc-600">
            Business name
            <Input className="mt-1" value={draft.brandName} maxLength={80} onChange={(event) => update({ brandName: event.target.value })} />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Header subtitle
            <Input className="mt-1" value={draft.subtitle} maxLength={80} placeholder="Receipt Photobooth" onChange={(event) => update({ subtitle: event.target.value })} />
          </label>
          <div>
            <span className="block text-xs font-medium text-zinc-600">Business logo</span>
            <div className="mt-1 flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
              <img src={draft.logoUrl} alt="Business logo preview" className="size-12 rounded-lg object-contain ring-1 ring-zinc-100" />
              <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-center text-xs font-medium text-zinc-600 hover:bg-zinc-50">
                <Upload className="mx-auto mb-1 size-4" />
                {uploading ? "Uploading..." : "Upload logo"}
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleLogo(file); event.currentTarget.value = ""; }} />
              </label>
              <button type="button" className="text-xs text-zinc-400 hover:text-zinc-700" onClick={() => update({ logoUrl: DEFAULT_GALLERY_BRANDING.logoUrl })}>Reset</button>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-400">Warna gallery mengikuti default Poskart agar hasil tetap konsisten dan mudah dibaca.</p>
          <label className="block text-xs font-medium text-zinc-600">
            Footer text
            <Input className="mt-1" value={draft.footerText} maxLength={160} onChange={(event) => update({ footerText: event.target.value })} />
            <span className="mt-1 block text-[10px] font-normal text-zinc-400">Copyright otomatis menjadi: © tahun berjalan + Business name.</span>
          </label>
          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="ghost" onClick={reset}><RotateCcw className="mr-2 size-3.5" />Reset Default</Button>
            <Button type="button" disabled={uploading || updateBranding.isPending} onClick={() => void save()}>{updateBranding.isPending ? "Saving..." : "Save branding"}</Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Preview</h2>
            <p className="mt-1 text-xs text-zinc-500">Contoh halaman publik hasil gallery.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Public gallery</span>
        </div>
        <div className="gallery-branding-preview overflow-hidden rounded-[22px] border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src={draft.logoUrl} alt="" className="size-9 shrink-0 rounded-lg object-contain" />
              <div className="min-w-0"><strong className="block truncate text-sm font-semibold text-zinc-900">{draft.brandName}</strong><span className="block truncate text-xs text-zinc-500">{draft.subtitle}</span></div>
            </div>
            <span className="hidden text-xs text-zinc-500 sm:block">Foto tersimpan aman</span>
          </div>
          <div className="p-4 sm:p-8">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Hasil photobooth Anda</p>
            <h3 className="mt-2 text-center text-2xl font-semibold tracking-tight text-zinc-900">Momen Anda sudah siap.</h3>
            <p className="mx-auto mt-2 max-w-sm text-center text-xs leading-5 text-zinc-600">Simpan foto dengan frame atau unduh setiap foto original dari sesi ini.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
              <div className="gallery-branding-card min-h-48 rounded-2xl border border-black/10 p-3"><div className="grid h-full min-h-40 place-items-center rounded-xl bg-zinc-100 text-xs text-zinc-400">Framed photo preview</div></div>
              <div className="gallery-branding-card rounded-2xl border border-black/10 p-4"><div className="flex items-center gap-2"><ImagePlus className="size-4" /><span className="text-sm font-semibold">Foto original</span></div><div className="mt-4 grid grid-cols-2 gap-2"><span className="h-16 rounded-xl bg-zinc-100" /><span className="h-16 rounded-xl bg-zinc-100" /><span className="h-16 rounded-xl bg-zinc-100" /><span className="h-16 rounded-xl bg-zinc-100" /></div></div>
            </div>
          </div>
          <div className="gallery-branding-preview-footer flex flex-col gap-3 border-t border-black/10 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between"><span>{copyright}</span><span className="w-fit rounded-full border border-zinc-200 bg-white px-4 py-2 font-medium">Contact Support</span></div>
          <div className="px-4 py-7 text-center text-4xl font-black uppercase tracking-[-0.08em] text-black/[0.05]">{draft.footerText}</div>
        </div>
      </section>
    </div>
  );
}
