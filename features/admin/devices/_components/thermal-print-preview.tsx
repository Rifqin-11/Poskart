"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { thermalPreviewRaster, type ThermalPreviewOptions } from "@/lib/thermal-preview";

export function ThermalPrintPreview({ brightness, contrast, dotDensity, shadowLift }: {
  brightness: number; contrast: number; dotDensity: number; shadowLift: number;
}) {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [original, setOriginal] = useState("");
  const [paper, setPaper] = useState("80mm");
  const [style, setStyle] = useState<ThermalPreviewOptions["printStyle"]>("thermal_photo");
  const [sharpness, setSharpness] = useState(20);
  const [zoom, setZoom] = useState(false);
  const [picking, setPicking] = useState(false);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState({ src: "", key: "", error: "" });
  const pickGeneration = useRef(0);
  const key = JSON.stringify([brightness, contrast, dotDensity, shadowLift, paper, style, sharpness]);
  const updating = source !== null && key !== result.key;

  useEffect(() => () => { pickGeneration.current++; }, []);

  useEffect(() => {
    if (!source) return;
    const timer = setTimeout(() => {
      try {
        const width = paper === "58mm" ? 384 : 576;
        const canvas = document.createElement("canvas");
        canvas.width = style === "thermal_photo" ? width : Math.min(width, source.width);
        canvas.height = Math.max(1, Math.round(source.height * canvas.width / source.width));
        if (canvas.width * canvas.height > 4_000_000) throw new Error("Photo too tall");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = thermalPreviewRaster(data.data, canvas.width, canvas.height, {
          brightness, contrast, dotDensity, shadowLift, sharpness, printStyle: style,
        });
        data.data.set(pixels);
        ctx.putImageData(data, 0, 0);
        setResult({ src: canvas.toDataURL("image/png"), key, error: "" });
      } catch {
        setResult({ src: "", key, error: "Preview gagal dibuat. Pilih foto JPG/PNG dengan rasio normal." });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [source, brightness, contrast, dotDensity, shadowLift, paper, style, sharpness, key]);

  async function pick(file?: File) {
    if (!file) return;
    const generation = ++pickGeneration.current;
    setFileError("");
    if (file.size > 15 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type)) {
      setFileError("Pilih JPG/PNG maksimal 15 MB.");
      return;
    }
    setPicking(true);
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      if (generation !== pickGeneration.current) return;
      if (bitmap.width * bitmap.height > 40_000_000) throw new Error("Photo too large");
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setOriginal(canvas.toDataURL("image/png"));
      setSource(canvas);
      setResult({ src: "", key: "", error: "" });
    } catch {
      if (generation === pickGeneration.current) setFileError("Foto tidak dapat dibuka. Pilih JPG/PNG lain (maksimal 40 megapiksel).");
    } finally {
      bitmap?.close();
      if (generation === pickGeneration.current) setPicking(false);
    }
  }

  return (
    <section className="mt-5 border-t border-zinc-200 pt-5" aria-label="Preview cetak thermal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">Preview cetak thermal</h4>
          <p className="mt-1 max-w-prose text-xs leading-5 text-zinc-500">Pilih foto event dan bandingkan sebelum mencetak. Foto hanya diproses di browser, tidak diunggah.</p>
        </div>
        <label className="relative cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 focus-within:ring-2 focus-within:ring-blue-600">
          {picking ? "Membuka foto…" : source ? "Ganti foto uji" : "Pilih foto uji"}
          <input type="file" accept="image/jpeg,image/png" className="sr-only" disabled={picking}
            onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-zinc-600">Kertas simulasi
          <select className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white p-2" value={paper} onChange={(e) => setPaper(e.target.value)}>
            <option value="58mm">58 mm</option><option value="80mm">80 mm</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">Gaya simulasi
          <select className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white p-2" value={style} onChange={(e) => setStyle(e.target.value as ThermalPreviewOptions["printStyle"])}>
            <option value="thermal_photo">Photo Smooth</option><option value="smooth">Smooth</option><option value="retro">Retro</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">Ketajaman simulasi: {sharpness}%
          <input type="range" className="mt-3 block w-full accent-[#00357B]" min={0} max={100} step={1} value={sharpness} onChange={(e) => setSharpness(Number(e.target.value))} />
        </label>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-zinc-500">Samakan kertas, gaya, dan ketajaman simulasi dengan kiosk. Ketiganya hanya untuk preview ini, tidak mengubah konfigurasi kiosk.</p>
      {(fileError || result.error) && <p role="alert" className="mt-3 text-xs text-red-700">{fileError || result.error}</p>}
      {!source ? <p className="mt-5 rounded-xl bg-white p-5 text-xs leading-5 text-zinc-500">Belum ada foto uji. Penyesuaian tidak berjalan otomatis dan tidak mengubah foto digital.</p> : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <figure><figcaption className="mb-2 text-xs font-medium text-zinc-600">Foto digital (tidak berubah)</figcaption>
            <Image src={original} alt="Foto uji digital" width={576} height={576} unoptimized className="h-72 w-full bg-white object-contain" />
          </figure>
          <figure aria-busy={updating}><figcaption className="mb-2 text-xs font-medium text-zinc-600" aria-live="polite">{updating ? "Memperbarui simulasi…" : `Simulasi thermal · ${paper}`}</figcaption>
            {result.src && <Image src={result.src} alt="Simulasi raster cetak thermal" width={576} height={576} unoptimized className={`h-72 w-full bg-white object-contain [image-rendering:pixelated] ${updating ? "opacity-40" : ""}`} />}
            <Button type="button" variant="ghost" size="sm" disabled={!result.src || updating} onClick={() => setZoom(true)}>Perbesar thermal</Button>
          </figure>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-5 text-zinc-500">Simulasi browser, bukan jaminan hasil fisik. Resampling, driver printer, panas, dan kertas dapat berbeda. Untuk preview raster USB yang persis, gunakan Settings → Printer di kiosk.</p>
      {zoom && createPortal(<Dialog open onOpenChange={setZoom} title="Simulasi thermal" className="max-w-3xl">
        <div className="max-h-[70dvh] overflow-auto bg-white p-3">
          <Image src={result.src} alt="Simulasi thermal diperbesar" width={1152} height={1152} unoptimized className="h-auto w-full [image-rendering:pixelated]" />
        </div>
      </Dialog>, document.body)}
    </section>
  );
}
