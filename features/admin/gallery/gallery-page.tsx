import Link from "next/link";
import { ExternalLink, ImageIcon, Images } from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type GallerySessionRow = {
  id: string;
  device_id: string | null;
  template_name: string;
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
    .select("id,device_id,template_name,share_url,created_at")
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

  return (
    <div className="space-y-6">
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

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((session) => {
          const sessionPhotos = photoRows.filter(
            (photo) => photo.session_id === session.id,
          );
          const framed = sessionPhotos.find(
            (photo) => photo.kind === "framed",
          );
          const rawCount = sessionPhotos.filter(
            (photo) => photo.kind === "raw",
          ).length;

          return (
            <Card key={session.id} className="overflow-hidden rounded-2xl">
              <div className="aspect-[4/3] bg-zinc-100">
                {framed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={framed.secure_url}
                    alt={session.template_name || "POSKART session"}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-zinc-400">
                    <ImageIcon className="size-10" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-zinc-950">
                      {session.template_name || "Photobooth session"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(session.created_at))}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                    {rawCount} raw
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                  <span className="truncate">
                    {session.device_id || "Unknown device"}
                  </span>
                  <Link
                    href={session.share_url || `/s/${session.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 font-medium text-zinc-950"
                  >
                    Open
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
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
