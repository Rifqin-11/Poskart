import Link from "next/link";
import { notFound } from "next/navigation";

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
  const framed = photos?.find((photo) => photo.kind === "framed");
  const raw = photos?.filter((photo) => photo.kind === "raw") ?? [];

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 py-12 text-zinc-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            POSKART
          </Link>
          <span className="text-sm text-zinc-500">Digital photo delivery</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Your photobooth result
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Foto Anda sudah siap.
            </h1>
            <p className="mt-4 max-w-xl text-zinc-600">
              Download hasil dengan frame atau simpan foto mentah dari sesi
              POSKART ini.
            </p>
            {framed ? (
              <div className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-white p-3 shadow-xl shadow-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={framed.secure_url}
                  alt={`POSKART ${session.template_name}`}
                  className="max-h-[70vh] w-full rounded-2xl object-contain"
                />
              </div>
            ) : (
              <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500">
                Hasil dengan frame sedang diproses.
              </div>
            )}
          </section>

          <aside className="lg:pt-28">
            {framed ? (
              <a
                href={framed.secure_url}
                download
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white"
              >
                Download framed photo
              </a>
            ) : null}
            {raw.length > 0 ? (
              <div className="mt-6">
                <h2 className="text-sm font-semibold">Raw photos</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {raw.map((photo, index) => (
                    <a
                      key={photo.id}
                      href={photo.secure_url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.secure_url}
                        alt={`Raw photo ${index + 1}`}
                        className="aspect-[4/5] w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
