import Link from "next/link";
import {
  ArrowDownToLine,
  CheckCircle2,
  Download,
  Images,
  X,
} from "lucide-react";

import { businessProfile } from "@/lib/constants/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SharedGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { sessionId } = await params;
  const { view: viewPhotoId } = await searchParams;
  const supabase = createSupabaseAdminClient();
  const { data: session } = await supabase
    .from("gallery_sessions")
    .select("id,template_name,created_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return (
      <main className="min-h-screen bg-white px-5 py-6 text-zinc-950 md:px-8 md:py-10 flex flex-col justify-center items-center">
        <noscript>
          <meta httpEquiv="refresh" content="2" />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(() => window.location.reload(), 2000);`,
          }}
        />
        <div className="text-center max-w-md">
          <span className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-zinc-50 border border-black/5 mx-auto animate-pulse">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo Poskart.png"
              alt="POSKART Logo"
              className="size-10 object-contain"
            />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900">
            Menyiapkan Momen Anda...
          </h1>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
            Foto-foto sedang diunggah dengan aman ke server. Halaman ini akan memuat ulang secara otomatis dalam beberapa saat.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="size-6 rounded-full border-2 border-zinc-200 border-t-zinc-800 animate-spin" />
          </div>
        </div>
      </main>
    );
  }

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("id,kind,photo_index,secure_url")
    .eq("session_id", sessionId)
    .order("kind", { ascending: false })
    .order("photo_index", { ascending: true });
  const framedGif = photos?.find((photo) => photo.kind === "framed" && photo.photo_index === 1);
  const framedStatic = photos?.find((photo) => photo.kind === "framed" && photo.photo_index === 0);
  const raw = photos?.filter((photo) => photo.kind === "raw" && photo.photo_index !== 99) ?? [];
  const rawGif = photos?.find((photo) => photo.kind === "raw" && photo.photo_index === 99);
  const selectedPhoto = photos?.find((photo) => photo.id === viewPhotoId);
  const photoCount = photos?.length ?? 0;
  const refreshUntil = new Date(session.created_at).getTime() + 120_000;
  
  // Expiry date calculation (7 days after creation)
  const expiryDate = new Date(new Date(session.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
  const day = expiryDate.getDate().toString().padStart(2, '0');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthName = months[expiryDate.getMonth()];
  const year = expiryDate.getFullYear();
  const formattedExpiryDate = `${day} ${monthName} ${year}`;

  const hasAnyFramed = Boolean(framedGif || framedStatic);
  const hasAnyRaw = raw.length > 0 || Boolean(rawGif);

  const waitingForAssets =
    photoCount === 0 ||
    !framedStatic ||
    !framedGif ||
    raw.length === 0 ||
    !rawGif;

  const isWithinRefreshWindow = Date.now() < refreshUntil;
  const shouldRefreshWhileProcessing =
    !selectedPhoto && waitingForAssets && isWithinRefreshWindow;

  return (
    <main className="min-h-screen bg-white px-5 py-6 text-zinc-950 md:px-8 md:py-10">
      {shouldRefreshWhileProcessing && (
        <ProcessingRefresh refreshUntil={refreshUntil} />
      )}
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between border-b border-black/10 pb-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Logo Poskart.png"
                alt="POSKART Logo"
                className="size-8 object-contain"
              />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                {businessProfile.brandName}
              </span>
              <span className="block text-xs text-zinc-500">
                Photobooth OS
              </span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
            <CheckCircle2 className="size-4 text-emerald-600" />
            Foto tersimpan aman
          </span>
        </div>

        <section className="py-10 text-center md:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Hasil photobooth Anda
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
            Momen Anda sudah siap.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-600 md:text-base">
            Simpan foto dengan frame atau unduh setiap foto original dari sesi
            POSKART ini.
          </p>
          <div className="mx-auto mt-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-1.5 bg-amber-500"></span>
              </span>
              Tautan ini aktif selama 7 hari (sampai {formattedExpiryDate})
            </span>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="rounded-[28px] border border-black/10 bg-white p-3 shadow-xl shadow-black/5 md:p-5 grid gap-6">
            {framedGif && (
              <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-3 md:p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Frame Animasi (GIF)
                </p>
                <Link
                  href={`?view=${framedGif.id}`}
                  className="block group relative overflow-hidden rounded-xl cursor-zoom-in bg-zinc-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={framedGif.secure_url}
                    alt={`POSKART ${session.template_name} GIF`}
                    className="max-h-[58vh] w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur">
                      Klik untuk memperbesar
                    </span>
                  </div>
                </Link>
                <div className="mt-3 flex gap-3">
                  <Link
                    href={`?view=${framedGif.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-50"
                  >
                    Lihat Animasi
                  </Link>
                  <a
                    href={`/s/${encodeURIComponent(sessionId)}/download/${framedGif.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    <ArrowDownToLine className="size-4" />
                    Download GIF
                  </a>
                </div>
              </div>
            )}

            {!framedGif && framedStatic && isWithinRefreshWindow && (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/30 p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-[240px]">
                <div className="relative flex items-center justify-center mb-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-200 border-t-zinc-800" />
                  <span className="absolute text-[8px] font-bold uppercase tracking-wider text-zinc-600">GIF</span>
                </div>
                <p className="text-sm font-semibold text-zinc-800">
                  Frame Animasi (GIF) Sedang Diproses
                </p>
                <p className="mt-1 text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Foto sedang dirangkai menjadi animasi GIF. Halaman akan memuat ulang otomatis ketika siap.
                </p>
              </div>
            )}

            {framedStatic && (
              <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-3 md:p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Frame Foto (PNG)
                </p>
                <Link
                  href={`?view=${framedStatic.id}`}
                  className="block group relative overflow-hidden rounded-xl cursor-zoom-in bg-zinc-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={framedStatic.secure_url}
                    alt={`POSKART ${session.template_name} Foto`}
                    className="max-h-[58vh] w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur">
                      Klik untuk memperbesar
                    </span>
                  </div>
                </Link>
                <div className="mt-3 flex gap-3">
                  <Link
                    href={`?view=${framedStatic.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-50"
                  >
                    Lihat Foto
                  </Link>
                  <a
                    href={`/s/${encodeURIComponent(sessionId)}/download/${framedStatic.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    <ArrowDownToLine className="size-4" />
                    Download Foto
                  </a>
                </div>
              </div>
            )}

            {!framedGif && !framedStatic && (
              <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center text-zinc-500">
                Hasil foto sedang disiapkan. Halaman ini akan memperbarui otomatis.
              </div>
            )}
          </section>

          <aside className="rounded-[28px] border border-black/10 bg-white p-5 md:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-zinc-100">
                <Images className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">Foto original</h2>
                <p className="text-xs text-zinc-500">
                  {hasAnyRaw
                    ? `${raw.length} foto ${rawGif ? "& 1 animasi " : ""}tanpa frame`
                    : "Menyiapkan foto original"}
                </p>
              </div>
            </div>

            {rawGif && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-2.5 transition-colors hover:bg-zinc-50">
                <Link
                  href={`?view=${rawGif.id}`}
                  className="flex flex-1 items-center gap-3 min-w-0 cursor-zoom-in"
                >
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rawGif.secure_url}
                      alt="Raw GIF"
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Animasi Original (GIF)
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Gabungan semua frame kamera
                    </p>
                  </div>
                </Link>
                <a
                  href={`/s/${encodeURIComponent(sessionId)}/download/${rawGif.id}`}
                  aria-label="Download Animasi Original GIF"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 transition-colors hover:bg-zinc-950 hover:text-white"
                >
                  <Download className="size-4" />
                </a>
              </div>
            )}

            {!rawGif && raw.length > 0 && isWithinRefreshWindow && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/30 p-3 text-zinc-500">
                <div className="size-5 shrink-0 rounded-full border border-zinc-300 border-t-zinc-700 animate-spin" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-750">
                    Animasi Original (GIF) Sedang Diproses
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Sedang diunggah ke server...
                  </p>
                </div>
              </div>
            )}

            {raw.length > 0 ? (
              <div className="mt-4 space-y-3">
                {raw.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-2.5 transition-colors hover:bg-zinc-50"
                  >
                    <Link
                      href={`?view=${photo.id}`}
                      className="flex flex-1 items-center gap-3 min-w-0 cursor-zoom-in"
                    >
                      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.secure_url}
                          alt={`Foto original ${index + 1}`}
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          Foto original {index + 1}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Resolusi asli dari kamera
                        </p>
                      </div>
                    </Link>
                    <a
                      href={`/s/${encodeURIComponent(sessionId)}/download/${photo.id}`}
                      aria-label={`Download foto original ${index + 1}`}
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 transition-colors hover:bg-zinc-950 hover:text-white"
                    >
                      <Download className="size-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              !rawGif && (
                <div className="mt-5 rounded-2xl bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                  Foto original sedang disiapkan. Hasil utama dengan frame bisa diunduh terlebih dahulu.
                </div>
              )
            )}
          </aside>
        </div>

        <footer className="mt-10 overflow-hidden bg-white">
          <div className="flex min-h-[300px] flex-col px-0 py-7 sm:min-h-[360px] lg:min-h-[384px]">
            <div className="flex flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-start sm:justify-between">
              <p>© 2026 {businessProfile.legalName}. All rights reserved.</p>
              <Link
                href="/contact"
                className="inline-flex h-10 w-fit items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 shadow-[0_1px_2px_rgba(24,24,27,0.02)] transition-colors hover:bg-zinc-50"
              >
                Contact Support
              </Link>
            </div>

            <div className="mt-auto w-full select-none overflow-hidden pt-16 sm:pt-20">
              <div
                aria-hidden="true"
                className="text-center font-sans text-[clamp(5.75rem,20vw,15rem)] font-black uppercase leading-[0.78] tracking-[-0.085em] text-[#f4f4f5] sm:leading-[0.74]"
              >
                POSKART
              </div>
            </div>
          </div>
        </footer>
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          {/* Close button in top-left corner */}
          <Link
            href={`/s/${encodeURIComponent(sessionId)}`}
            className="absolute left-6 top-6 grid size-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-all duration-200 hover:bg-white/20 hover:scale-105"
            aria-label="Tutup"
          >
            <X className="size-6" />
          </Link>

          {/* Download button in top-right corner */}
          <a
            href={`/s/${encodeURIComponent(sessionId)}/download/${selectedPhoto.id}`}
            className="absolute right-6 top-6 flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 shadow transition-all duration-200 hover:bg-zinc-100 hover:scale-[1.02]"
          >
            <Download className="size-4" />
            Download
          </a>

          {/* Centered Image / GIF preview */}
          <div className="relative max-h-[80vh] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto.secure_url}
              alt="Pratinjau Foto"
              className="max-h-[80vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}

function ProcessingRefresh({ refreshUntil }: { refreshUntil: number }) {
  return (
    <>
      <noscript>
        <meta httpEquiv="refresh" content="2" />
      </noscript>
      <script
        dangerouslySetInnerHTML={{
          __html: `if (Date.now() < ${JSON.stringify(refreshUntil)}) setTimeout(() => window.location.reload(), 2000);`,
        }}
      />
    </>
  );
}
