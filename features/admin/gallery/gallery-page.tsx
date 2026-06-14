import Link from "next/link";
import {
  CalendarDays,
  CircleCheck,
  ExternalLink,
  ImageIcon,
  Images,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { DeleteSessionButton } from "@/app/(admin)/gallery/delete-button";
import { PrintSessionButton } from "@/app/(admin)/gallery/print-button";

type GallerySessionRow = {
  id: string;
  device_id: string | null;
  template_name: string;
  social_media_consent: boolean;
  share_url: string | null;
  created_at: string;
};

type GalleryPhotoRow = {
  id: string;
  session_id: string;
  kind: "raw" | "framed";
  photo_index: number;
  secure_url: string;
};

export async function GalleryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const organizationId = membership?.organization_id;

  if (!organizationId) {
    return <GalleryEmpty message="Akun ini belum terhubung ke organisasi." />;
  }

  const { data: sessions } = await supabase
    .from("gallery_sessions")
    .select(
      "id,device_id,template_name,social_media_consent,share_url,created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (sessions ?? []) as GallerySessionRow[];
  const sessionIds = rows.map((session) => session.id);
  const { data: photos } = sessionIds.length
    ? await supabase
        .from("gallery_photos")
        .select("id,session_id,kind,photo_index,secure_url")
        .in("session_id", sessionIds)
        .order("photo_index", { ascending: true })
    : { data: [] };
  const photoRows = (photos ?? []) as GalleryPhotoRow[];

  if (rows.length === 0) {
    return (
      <GalleryEmpty message="Hasil photobooth akan muncul setelah kiosk membuat QR dan menyelesaikan upload." />
    );
  }

  const sessionsByDate = rows.reduce<
    Map<string, { label: string; sessions: GallerySessionRow[] }>
  >((groups, session) => {
    const date = new Date(session.created_at);

    // Get year, month, day in Asia/Jakarta timezone
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((p) => p.type === "year")?.value || "1970";
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    const key = `${year}-${month}-${day}`;

    const existing = groups.get(key);
    if (existing) {
      existing.sessions.push(session);
    } else {
      groups.set(key, {
        label: new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date),
        sessions: [session],
      });
    }
    return groups;
  }, new Map());

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
          <Images className="size-4" />
          Cloud gallery
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          Gallery
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Hasil raw dan framed photo yang diunggah kiosk ke Cloudinary.
        </p>
      </header>

      {[...sessionsByDate.entries()].map(([dateKey, group]) => (
        <section key={dateKey}>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-zinc-400" />
            <h2 className="text-sm font-semibold capitalize text-zinc-800">
              {group.label}
            </h2>
            <span className="text-xs text-zinc-400">
              {group.sessions.length} sesi
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {group.sessions.map((session) => {
              const sessionPhotos = photoRows.filter(
                (photo) => photo.session_id === session.id,
              );
              const framed = sessionPhotos.find(
                (photo) => photo.kind === "framed",
              );
              const rawCount = sessionPhotos.filter(
                (photo) =>
                  photo.kind === "raw" &&
                  photo.photo_index !== 98 &&
                  photo.photo_index !== 99,
              ).length;
              const hasGif = sessionPhotos.some(
                (photo) => photo.kind === "raw" && photo.photo_index === 98,
              );

              return (
                <Card
                  key={session.id}
                  className="group overflow-hidden rounded-xl border-zinc-200 py-0 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[4/3] bg-zinc-100">
                    {framed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={framed.secure_url}
                        alt={session.template_name || "POSKART session"}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-zinc-400">
                        <ImageIcon className="size-7" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-zinc-950">
                          {session.template_name || "Photobooth session"}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {new Intl.DateTimeFormat("id-ID", {
                            timeZone: "Asia/Jakarta",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(session.created_at))}
                          {" · "}
                          {rawCount} raw
                          {hasGif ? " · GIF" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Link
                          href={session.share_url || `/s/${session.id}`}
                          target="_blank"
                          aria-label="Buka hasil foto"
                          className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                        <PrintSessionButton
                          sessionId={session.id}
                          disabled={!framed || !session.device_id}
                        />
                        <DeleteSessionButton sessionId={session.id} />
                      </div>
                    </div>
                    <p className="mt-2 truncate text-[11px] text-zinc-400">
                      {session.device_id || "Unknown device"}
                    </p>
                    {session.social_media_consent && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CircleCheck className="size-3.5" />
                        Setuju sosial media
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function GalleryEmpty({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Gallery
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Hasil raw dan framed photo dari kiosk.
        </p>
      </header>
      <Card className="grid min-h-80 place-items-center rounded-2xl border-dashed p-10 text-center">
        <div>
          <Images className="mx-auto size-10 text-zinc-400" />
          <p className="mt-4 max-w-md text-sm text-zinc-500">{message}</p>
        </div>
      </Card>
    </div>
  );
}
