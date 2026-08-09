import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Images } from "lucide-react";
import { notFound } from "next/navigation";

import { businessProfile } from "@/lib/constants/business";
import {
  getGalleryRetentionConfig,
  isGalleryLinkExpired,
} from "@/lib/gallery/retention";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PublicFooter } from "@/features/root/shell/public-site-shell";

export const dynamic = "force-dynamic";

type SharedGalleryRow = {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
};

type SharedGalleryReferenceRow = {
  gallery_session_id: string;
  position: number;
};

type GallerySessionRow = {
  id: string;
  template_name: string;
  social_media_consent: boolean;
  created_at: string;
};

type GalleryPhotoRow = {
  session_id: string;
  secure_url: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("shared_galleries")
    .select("name")
    .eq("public_token", token)
    .maybeSingle();

  return {
    title: data?.name ? `${data.name} | POSKART Gallery` : "POSKART Gallery",
    robots: { index: false, follow: false },
  };
}

export default async function PublicSharedGalleryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: galleryData } = await supabase
    .from("shared_galleries")
    .select("id,organization_id,name,created_at")
    .eq("public_token", token)
    .maybeSingle();

  if (!galleryData) notFound();

  const gallery = galleryData as SharedGalleryRow;
  const [{ data: referenceData }, { data: organization }] = await Promise.all([
    supabase
      .from("shared_gallery_sessions")
      .select("gallery_session_id,position")
      .eq("shared_gallery_id", gallery.id)
      .order("position", { ascending: true }),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", gallery.organization_id)
      .maybeSingle(),
  ]);

  const references = (referenceData ?? []) as SharedGalleryReferenceRow[];
  const sessionIds = references.map(
    (reference) => reference.gallery_session_id,
  );
  const [{ data: sessionData }, { data: photoData }, retention] =
    await Promise.all([
      sessionIds.length
        ? supabase
            .from("gallery_sessions")
            .select("id,template_name,social_media_consent,created_at")
            .eq("organization_id", gallery.organization_id)
            .in("id", sessionIds)
        : Promise.resolve({ data: [] }),
      sessionIds.length
        ? supabase
            .from("gallery_photos")
            .select("session_id,secure_url")
            .eq("organization_id", gallery.organization_id)
            .eq("kind", "framed")
            .eq("photo_index", 0)
            .in("session_id", sessionIds)
        : Promise.resolve({ data: [] }),
      getGalleryRetentionConfig(),
    ]);

  const sessionsById = new Map(
    ((sessionData ?? []) as GallerySessionRow[]).map((session) => [
      session.id,
      session,
    ]),
  );
  const photosBySessionId = new Map(
    ((photoData ?? []) as GalleryPhotoRow[])
      .filter((photo) => Boolean(photo.secure_url))
      .map((photo) => [photo.session_id, photo.secure_url]),
  );
  const sessions = references.flatMap((reference) => {
    const session = sessionsById.get(reference.gallery_session_id);
    if (
      !session ||
      isGalleryLinkExpired(session.created_at, retention.linkExpiryHours)
    ) {
      return [];
    }
    return [session];
  });

  return (
    <main className="min-h-[100dvh] overflow-clip bg-white text-zinc-950">
      <div className="mx-auto max-w-[90rem] px-5 pb-20 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-zinc-200 pb-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Logo Poskart.png"
                alt="POSKART"
                className="size-8 object-contain"
              />
            </span>
            <span>
              <span className="block text-sm font-semibold">
                {businessProfile.brandName}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Shared showcase
              </span>
            </span>
          </Link>
          <span className="hidden text-xs text-zinc-500 sm:block">
            {organization?.name ?? businessProfile.businessName}
          </span>
        </header>

        <section className="grid gap-10 border-b border-zinc-200 py-16 sm:py-24 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#00357B]">
              A POSKART collection
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                {gallery.name}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-600">
                {sessions.length} momen dipilih untuk dibagikan
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <p className="text-sm text-zinc-500">
              Dibuat {formatDate(gallery.created_at)}
            </p>
            <div className="h-px w-32 bg-zinc-300 lg:w-48" />
            <p className="max-w-xs text-left text-sm leading-6 text-zinc-500 lg:text-right">
              Kumpulan momen yang dirangkum untuk dinikmati, disimpan, dan dibagikan.
            </p>
          </div>
        </section>

        <section className="pt-14 sm:pt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">The moments</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Koleksi foto</h2>
            </div>
            <span className="text-xs tabular-nums text-zinc-400">{String(sessions.length).padStart(2, "0")} frames</span>
          </div>
        {sessions.length === 0 ? (
          <section className="grid min-h-80 place-items-center border border-dashed border-zinc-300 bg-white p-8 text-center">
            <div>
              <Images className="mx-auto size-9 text-zinc-400" />
              <h2 className="mt-4 text-base font-semibold">
                Belum ada foto yang tersedia
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Foto yang telah melewati masa simpan atau dihapus dari galeri
                utama otomatis tidak lagi tampil di koleksi ini.
              </p>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {sessions.map((session) => {
              const thumbnail = photosBySessionId.get(session.id);
              return (
                <Link
                  key={session.id}
                  href={`/s/${encodeURIComponent(session.id)}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100/80 p-2 sm:p-2.5">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt={session.template_name || "POSKART photo"}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-zinc-400">
                        <Images className="size-7" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 text-zinc-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h2 className="truncate text-sm font-semibold">
                      {session.template_name || "Photobooth session"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDate(session.created_at)}
                    </p>
                    {session.social_media_consent && (
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCircle2 className="size-3" />
                        Setuju sosial media
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}
        </section>

      </div>
      <PublicFooter className="border-t border-zinc-200" />
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
