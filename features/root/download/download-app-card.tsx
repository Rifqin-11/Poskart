"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Download,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

type DownloadState = "preparing" | "started" | "unavailable";

type DownloadAppCardProps = {
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: string | null;
  publishedAt: string | null;
  releaseUrl: string;
  version: string | null;
};

export function DownloadAppCard({
  downloadUrl,
  fileName,
  fileSize,
  publishedAt,
  releaseUrl,
  version,
}: DownloadAppCardProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>(
    downloadUrl ? "preparing" : "unavailable",
  );
  const automaticDownloadStarted = useRef(false);

  const startDownload = useCallback(() => {
    if (!downloadUrl) {
      setDownloadState("unavailable");
      return;
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.rel = "noopener noreferrer";
    link.setAttribute("download", fileName ?? "POSKART-Kiosk.apk");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloadState("started");
  }, [downloadUrl, fileName]);

  useEffect(() => {
    if (!downloadUrl || automaticDownloadStarted.current) return;

    automaticDownloadStarted.current = true;
    const timeout = window.setTimeout(startDownload, 900);
    return () => window.clearTimeout(timeout);
  }, [downloadUrl, startDownload]);

  const isPreparing = downloadState === "preparing";
  const isStarted = downloadState === "started";

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] md:items-stretch">
      <section className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_20px_55px_rgba(0,53,123,0.09)]">
        <div className="border-b border-blue-100 bg-[linear-gradient(135deg,rgba(0,53,123,0.08),rgba(1,78,180,0.02)_58%,rgba(201,54,74,0.06))] p-5 sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-[#00357B] text-white shadow-[0_10px_24px_rgba(0,53,123,0.18)]">
                <Smartphone className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00357B]">
                  Android kiosk app
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
                  POSKART Kiosk
                </h2>
              </div>
            </div>
            {version ? (
              <span className="w-fit rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#00357B] backdrop-blur-xl">
                Versi {version}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div
            className="flex min-h-32 flex-col items-center justify-center rounded-[20px] border border-blue-100 bg-[#f7f9ff] px-5 py-6 text-center"
            aria-live="polite"
          >
            {isPreparing ? (
              <>
                <LoaderCircle className="size-8 animate-spin text-[#00357B] motion-reduce:animate-none" />
                <h3 className="mt-4 text-lg font-semibold text-zinc-950">
                  Menyiapkan download
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  File APK terbaru akan mulai diunduh secara otomatis.
                </p>
              </>
            ) : isStarted ? (
              <>
                <div className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-950">
                  Download seharusnya sudah dimulai
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Jika file belum muncul di daftar download browser, gunakan
                  tombol ulangi di bawah ini.
                </p>
              </>
            ) : (
              <>
                <ArrowDownToLine className="size-8 text-[#C9364A]" />
                <h3 className="mt-4 text-lg font-semibold text-zinc-950">
                  File terbaru belum dapat disiapkan
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Anda tetap dapat membuka halaman rilis POSKART untuk memilih
                  file APK terbaru secara manual.
                </p>
              </>
            )}
          </div>

          {downloadUrl ? (
            <button
              type="button"
              onClick={startDownload}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00357B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#014EB4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2"
            >
              {isStarted ? (
                <RotateCcw className="size-4" />
              ) : (
                <Download className="size-4" />
              )}
              {isStarted ? "Ulangi download" : "Download sekarang"}
            </button>
          ) : (
            <a
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00357B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#014EB4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2"
            >
              Buka halaman rilis
              <ExternalLink className="size-4" />
            </a>
          )}

          <p className="mt-3 text-center text-xs leading-5 text-zinc-400">
            Dengan mengunduh aplikasi, Anda menyetujui syarat penggunaan
            POSKART.
          </p>
        </div>
      </section>

      <aside className="flex flex-col rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Detail file
          </p>
          <dl className="mt-4 divide-y divide-zinc-100 text-sm">
            <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0">
              <dt className="text-zinc-500">Nama file</dt>
              <dd className="max-w-[210px] break-all text-right font-medium text-zinc-950">
                {fileName ?? "POSKART Kiosk APK"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-zinc-500">Ukuran</dt>
              <dd className="font-medium text-zinc-950">
                {fileSize ?? "Tersedia di halaman rilis"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-zinc-500">Dirilis</dt>
              <dd className="font-medium text-zinc-950">
                {publishedAt ?? "Rilis terbaru"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
              <dt className="text-zinc-500">Platform</dt>
              <dd className="font-medium text-zinc-950">Tablet Android</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 border-t border-zinc-100 pt-5">
          <h3 className="text-sm font-semibold text-zinc-950">
            Setelah file selesai diunduh
          </h3>
          <ol className="mt-3 space-y-3">
            {[
              "Buka file APK dari daftar download tablet.",
              "Izinkan instalasi dari browser jika Android memintanya.",
              "Buka POSKART Kiosk, login, lalu pasangkan kode melalui menu Devices di web.",
            ].map((step, index) => (
              <li
                key={step}
                className="flex gap-3 text-sm leading-5 text-zinc-600"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-[#00357B]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-start gap-3 rounded-[18px] border border-blue-100 bg-blue-50/50 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#00357B]" />
            <p className="text-xs leading-5 text-zinc-600">
              File berasal dari kanal rilis resmi POSKART. Android mungkin
              menampilkan konfirmasi keamanan sebelum instalasi.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
