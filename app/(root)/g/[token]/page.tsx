import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { notFound } from "next/navigation";

import { businessProfile } from "@/lib/constants/business";
import {
  getGalleryRetentionConfig,
  isGalleryLinkExpired,
} from "@/lib/gallery/retention";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
            .select("id,template_name,created_at")
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
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-8 lg:px-8">
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
              <span className="block text-xs text-zinc-500">
                Shared gallery
              </span>
            </span>
          </Link>
          <span className="hidden text-xs text-zinc-500 sm:block">
            {organization?.name ?? businessProfile.businessName}
          </span>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            POSKART Gallery
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {gallery.name}
              </h1>
              <p className="mt-3 text-sm text-zinc-500">
                {sessions.length} momen dipilih untuk dibagikan
              </p>
            </div>
            <p className="text-xs text-zinc-400">
              Dibuat {formatDate(gallery.created_at)}
            </p>
          </div>
        </section>

        {sessions.length === 0 ? (
          <section className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
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
          <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sessions.map((session) => {
              const thumbnail = photosBySessionId.get(session.id);
              return (
                <Link
                  key={session.id}
                  href={`/s/${encodeURIComponent(session.id)}`}
                  className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt={session.template_name || "POSKART photo"}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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
                  <div className="p-3 sm:p-4">
                    <h2 className="truncate text-sm font-semibold">
                      {session.template_name || "Photobooth session"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        <footer className="mt-16 flex flex-col gap-2 border-t border-zinc-200 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 POSKART Indonesia. All rights reserved.</span>
          <Link
            href="/contact"
            className="font-medium text-zinc-800 hover:underline"
          >
            Contact Support
          </Link>
        </footer>
      </div>
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
