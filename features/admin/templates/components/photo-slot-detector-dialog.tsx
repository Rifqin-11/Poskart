"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LoaderCircle,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  detectPhotoSlotsFromImage,
  type DetectedPhotoSlot,
  type PhotoSlotDetectionResult,
  type PhotoSlotMarkerMode,
} from "@/features/admin/templates/photo-slot-detection";
import { getColorKeyImageSourceCandidates } from "@/features/builder/utils/color-key-image-source";
import { cn } from "@/lib/utils";

export type PhotoSlotDetectionApplication = {
  candidates: DetectedPhotoSlot[];
  detection: PhotoSlotDetectionResult;
  replaceExisting: boolean;
  sensitivity: number;
};

export function PhotoSlotDetectorDialog({
  open,
  imageSource,
  existingSlotCount,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  imageSource: string;
  existingSlotCount: number;
  onOpenChange: (open: boolean) => void;
  onApply: (application: PhotoSlotDetectionApplication) => void;
}) {
  const [mode, setMode] = useState<PhotoSlotMarkerMode>("auto");
  const [customColor, setCustomColor] = useState("#FF00FF");
  const [sensitivity, setSensitivity] = useState(50);
  const [result, setResult] = useState<PhotoSlotDetectionResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replaceExisting, setReplaceExisting] = useState(
    existingSlotCount > 0,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const runDetection = useCallback(async () => {
    if (!imageSource) return;
    const runId = ++runIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextResult = await detectPhotoSlotsFromImage(imageSource, {
        mode,
        sensitivity,
        customColor,
      });
      if (runId !== runIdRef.current) return;
      setResult(nextResult);
      setSelectedIds(
        new Set(nextResult.candidates.map((candidate) => candidate.id)),
      );
    } catch (detectionError) {
      if (runId !== runIdRef.current) return;
      setResult(null);
      setSelectedIds(new Set());
      setError(
        detectionError instanceof Error
          ? detectionError.message
          : "Photo slot tidak dapat dideteksi.",
      );
    } finally {
      if (runId === runIdRef.current) setLoading(false);
    }
  }, [customColor, imageSource, mode, sensitivity]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void runDetection(), 300);
    return () => window.clearTimeout(timer);
  }, [open, runDetection]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(
      () => setReplaceExisting(existingSlotCount > 0),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [existingSlotCount, open]);

  const selectedCandidates = useMemo(
    () =>
      result?.candidates.filter((candidate) => selectedIds.has(candidate.id)) ??
      [],
    [result, selectedIds],
  );
  const previewSource =
    getColorKeyImageSourceCandidates(imageSource).at(-1) ?? imageSource;

  const toggleCandidate = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Deteksi otomatis photo slot"
      className="max-w-5xl"
      overlayClassName="z-[130]"
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <ScanSearch className="size-4 text-emerald-600" />
              Analisis lokal
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Gambar diproses di browser. Tidak menggunakan AI berbayar dan
              tidak mengirim gambar ke layanan tambahan.
            </p>
          </div>

          <label className="block text-xs font-medium text-zinc-600">
            Warna penanda
            <Select
              className="mt-1"
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as PhotoSlotMarkerMode)
              }
            >
              <option value="auto">Otomatis</option>
              <option value="custom">Custom</option>
            </Select>
          </label>

          {mode === "custom" ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-600">
                Warna custom
              </div>
              <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-2">
                <Input
                  className="h-9 p-1"
                  type="color"
                  value={
                    /^#[0-9a-f]{6}$/i.test(customColor)
                      ? customColor
                      : "#FF00FF"
                  }
                  onChange={(event) =>
                    setCustomColor(event.target.value.toUpperCase())
                  }
                  aria-label="Pilih warna penanda custom"
                />
                <Input
                  className="h-9 font-mono text-xs uppercase"
                  value={customColor}
                  maxLength={7}
                  placeholder="#FF00FF"
                  onChange={(event) => setCustomColor(event.target.value)}
                  aria-label="Kode HEX warna penanda custom"
                />
              </div>
              <span className="block text-[10px] leading-4 text-zinc-400">
                Pilih warna atau masukkan kode HEX yang digunakan pada area
                photo slot.
              </span>
            </div>
          ) : null}

          <label className="block text-xs font-medium text-zinc-600">
            Sensitivitas: {sensitivity}%
            <Slider
              className="mt-2"
              min={0}
              max={100}
              step={1}
              value={sensitivity}
              onChange={(event) => setSensitivity(Number(event.target.value))}
            />
            <span className="mt-1 block text-[10px] leading-4 text-zinc-400">
              Naikkan jika warna hasil export tidak solid. Turunkan jika
              dekorasi ikut terdeteksi.
            </span>
          </label>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => void runDetection()}
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Deteksi ulang
          </Button>

          {existingSlotCount > 0 ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div>
                <div className="text-xs font-semibold text-amber-900">
                  Ganti {existingSlotCount} slot lama
                </div>
                <p className="mt-0.5 text-[10px] leading-4 text-amber-700">
                  Nonaktifkan jika hasil deteksi ingin ditambahkan ke slot yang
                  sudah ada.
                </p>
              </div>
              <Switch
                checked={replaceExisting}
                onCheckedChange={setReplaceExisting}
                aria-label="Ganti photo slot lama"
              />
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
            {loading ? (
              "Menganalisis warna dan bentuk area…"
            ) : result ? (
              <>
                Ditemukan <strong>{result.candidates.length}</strong> kandidat
                {" · "}
                <strong>{selectedCandidates.length}</strong> dipilih
                <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
                  <span
                    className="size-3 rounded-full border border-black/10"
                    style={{ backgroundColor: result.markerColor }}
                  />
                  Warna terbaca {result.markerColor} ({result.markerMode})
                </div>
              </>
            ) : (
              "Belum ada kandidat photo slot."
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                Tinjau hasil
              </div>
              <div className="text-xs text-zinc-500">
                Klik area untuk memilih atau membatalkan.
              </div>
            </div>
            {result ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedIds(
                    selectedIds.size === result.candidates.length
                      ? new Set()
                      : new Set(
                          result.candidates.map((candidate) => candidate.id),
                        ),
                  )
                }
              >
                {selectedIds.size === result.candidates.length
                  ? "Batalkan semua"
                  : "Pilih semua"}
              </Button>
            ) : null}
          </div>

          <div className="grid min-h-72 place-items-center overflow-auto rounded-2xl border border-zinc-200 bg-[radial-gradient(circle,#d4d4d8_1px,transparent_1px)] bg-[size:16px_16px] p-4">
            {result ? (
              <div
                className="relative max-h-[58vh] max-w-full overflow-hidden rounded-lg bg-white shadow-xl"
                style={{
                  aspectRatio: `${result.imageWidth} / ${result.imageHeight}`,
                  width:
                    result.imageWidth >= result.imageHeight ? "100%" : "auto",
                  height:
                    result.imageWidth < result.imageHeight ? "58vh" : "auto",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSource}
                  alt="Frame dengan kandidat photo slot"
                  className="absolute inset-0 h-full w-full object-fill"
                />
                {result.candidates.map((candidate, index) => {
                  const selected = selectedIds.has(candidate.id);
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      aria-pressed={selected}
                      title={`Kandidat ${index + 1} · kepadatan ${Math.round(candidate.coverage * 100)}%`}
                      className={cn(
                        "absolute grid place-items-center border-2 transition-colors",
                        selected
                          ? "border-emerald-500 bg-emerald-400/25 shadow-[0_0_0_2px_rgba(255,255,255,0.85)]"
                          : "border-zinc-500 bg-zinc-950/30",
                      )}
                      style={{
                        left: `${candidate.x * 100}%`,
                        top: `${candidate.y * 100}%`,
                        width: `${candidate.width * 100}%`,
                        height: `${candidate.height * 100}%`,
                      }}
                      onClick={() => toggleCandidate(candidate.id)}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full text-xs font-bold shadow-sm",
                          selected
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-zinc-700",
                        )}
                      >
                        {index + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
                <LoaderCircle className="size-6 animate-spin" />
                Memindai frame…
              </div>
            ) : (
              <div className="max-w-sm text-center text-sm leading-6 text-zinc-500">
                {mode === "custom"
                  ? "Pastikan area photo slot memakai warna Custom yang dipilih secara solid, lalu jalankan deteksi ulang."
                  : "Pastikan area photo slot memakai warna hijau atau biru solid, lalu jalankan deteksi ulang."}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse justify-end gap-2 border-t border-zinc-100 pt-4 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Batal
        </Button>
        <Button
          type="button"
          disabled={!result || selectedCandidates.length === 0 || loading}
          onClick={() => {
            if (!result || selectedCandidates.length === 0) return;
            onApply({
              candidates: selectedCandidates,
              detection: {
                ...result,
                markerColor: averageMarkerColors(
                  selectedCandidates.map((candidate) => candidate.markerColor),
                ),
              },
              replaceExisting,
              sensitivity,
            });
            onOpenChange(false);
          }}
        >
          Terapkan {selectedCandidates.length || ""} photo slot
        </Button>
      </div>
    </Dialog>
  );
}

function averageMarkerColors(colors: string[]) {
  const channels = colors.map((color) => {
    const value = Number.parseInt(color.replace("#", ""), 16);
    return {
      red: (value >> 16) & 255,
      green: (value >> 8) & 255,
      blue: value & 255,
    };
  });
  const hex = (channel: "red" | "green" | "blue") =>
    Math.round(
      channels.reduce((total, color) => total + color[channel], 0) /
        Math.max(1, channels.length),
    )
      .toString(16)
      .padStart(2, "0");
  return `#${hex("red")}${hex("green")}${hex("blue")}`.toUpperCase();
}
