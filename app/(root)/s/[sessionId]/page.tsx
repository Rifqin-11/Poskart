import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownToLine,
  CheckCircle2,
  Download,
  Images,
} from "lucide-react";

import { businessProfile } from "@/lib/constants/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SharedGalleryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: session } = await supabase
    .from("gallery_sessions")
    .select("id,template_name,created_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) notFound();

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("id,kind,photo_index,secure_url")
    .eq("session_id", sessionId)
    .order("kind", { ascending: false })
    .order("photo_index", { ascending: true });
  const framed = photos?.find((photo) => photo.kind === "framed" && photo.photo_index === 1)
    || photos?.find((photo) => photo.kind === "framed" && photo.photo_index === 0);
  const raw = photos?.filter((photo) => photo.kind === "raw") ?? [];

  return (
    <main className="min-h-screen bg-white px-5 py-6 text-zinc-950 md:px-8 md:py-10">
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
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="rounded-[28px] border border-black/10 bg-white p-3 shadow-xl shadow-black/5 md:p-5">
            {framed ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={framed.secure_url}
                  alt={`POSKART ${session.template_name}`}
                  className="max-h-[68vh] w-full rounded-2xl bg-zinc-50 object-contain"
                />
                <a
                  href={`/s/${encodeURIComponent(sessionId)}/download/${framed.id}`}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  <ArrowDownToLine className="size-4" />
                  Download foto dengan frame
                </a>
              </>
            ) : (
              <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center text-zinc-500">
                Hasil dengan frame sedang diproses.
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
                  {raw.length} foto tanpa frame
                </p>
              </div>
            </div>

            {raw.length > 0 ? (
              <div className="mt-5 space-y-3">
                {raw.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-2.5"
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
              <div className="mt-5 rounded-2xl bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                Foto original tidak diunggah untuk sesi ini.
              </div>
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
    </main>
  );
}
