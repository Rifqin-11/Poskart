import { CalendarDays, Images } from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { GallerySessionCard } from "@/features/admin/gallery/gallery-session-card";
import { GalleryLoadMore } from "@/features/admin/gallery/gallery-load-more";
import {
  GalleryShareHeaderActions,
  GalleryShareProvider,
} from "@/features/admin/gallery/gallery-share-manager";
import type { SharedGallerySummary } from "@/features/admin/gallery/gallery-share-types";
import { getSiteUrl } from "@/lib/auth/site-url";
import {
  isActiveLivePhotoJob,
  shouldShowGallerySession,
} from "@/lib/gallery/session-visibility";

type GallerySessionRow = {
  id: string;
  device_id: string | null;
  transaction_id: string | null;
  template_name: string;
  social_media_consent: boolean;
  test_mode: boolean;
  share_url: string | null;
  created_at: string;
};

type GalleryPhotoRow = {
  id: string;
  session_id: string;
  kind: "raw" | "framed";
  photo_index: number;
  secure_url: string;
  format: string | null;
};

type LivePhotoJobRow = {
  session_id: string;
  status: string | null;
  updated_at: string | null;
};

type TransactionRow = {
  id: string;
  status: string | null;
  provider: string | null;
  merchant_order_id: string | null;
};

type SharedGalleryRow = {
  id: string;
  name: string;
  public_token: string;
  created_at: string;
};

type SharedGallerySessionRow = {
  shared_gallery_id: string;
};

const INITIAL_GALLERY_PAGE_SIZE = 50;

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

  const [{ data: sessions }, { data: sharedGalleryRows }] = await Promise.all([
    supabase
      .from("gallery_sessions")
      .select(
        "id,device_id,template_name,social_media_consent,test_mode,share_url,created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(INITIAL_GALLERY_PAGE_SIZE),
    supabase
      .from("shared_galleries")
      .select("id,name,public_token,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);
  const rows = (sessions ?? []) as GallerySessionRow[];
  const sharedRows = (sharedGalleryRows ?? []) as SharedGalleryRow[];
  const sharedGalleryIds = sharedRows.map((gallery) => gallery.id);
  const { data: sharedGallerySessionRows } = sharedGalleryIds.length
    ? await supabase
        .from("shared_gallery_sessions")
        .select("shared_gallery_id")
        .in("shared_gallery_id", sharedGalleryIds)
    : { data: [] };
  const sessionCountBySharedGallery = (
    (sharedGallerySessionRows ?? []) as SharedGallerySessionRow[]
  ).reduce<Map<string, number>>((counts, row) => {
    counts.set(
      row.shared_gallery_id,
      (counts.get(row.shared_gallery_id) ?? 0) + 1,
    );
    return counts;
  }, new Map());
  const siteUrl = await getSiteUrl();
  const sharedGalleries: SharedGallerySummary[] = sharedRows.map((gallery) => ({
    id: gallery.id,
    name: gallery.name,
    publicToken: gallery.public_token,
    publicUrl: `${siteUrl}/g/${gallery.public_token}`,
    sessionCount: sessionCountBySharedGallery.get(gallery.id) ?? 0,
    createdAt: gallery.created_at,
  }));
  const sessionIds = rows.map((session) => session.id);
  const { data: transactions } = sessionIds.length
    ? await supabase
        .from("transactions")
        .select("id,status,provider,merchant_order_id")
        .eq("organization_id", organizationId)
        .in("id", sessionIds)
    : { data: [] };
  const transactionRows = (transactions ?? []) as TransactionRow[];
  const transactionIds = new Set(
    transactionRows
      .filter((transaction) => !isOrphanQrisPendingTransaction(transaction))
      .map((transaction) => transaction.id),
  );
  const enrichedRows = rows.map((session) => ({
    ...session,
    transaction_id:
      !session.test_mode && transactionIds.has(session.id) ? session.id : null,
  }));
  const { data: primaryFrames } = sessionIds.length
    ? await supabase
        .from("gallery_photos")
        .select("id,session_id,kind,photo_index,secure_url,format")
        .in("session_id", sessionIds)
        .eq("organization_id", organizationId)
        .eq("kind", "framed")
        .eq("photo_index", 0)
        .order("photo_index", { ascending: true })
    : { data: [] };
  const photoRows = (primaryFrames ?? []) as GalleryPhotoRow[];
  const { data: livePhotoJobs } = sessionIds.length
    ? await supabase
        .from("live_photo_render_jobs")
        .select("session_id,status,updated_at")
        .in("session_id", sessionIds)
    : { data: [] };
  const livePhotoJobRows = (livePhotoJobs ?? []) as LivePhotoJobRow[];

  const photosBySessionId = photoRows.reduce<Map<string, GalleryPhotoRow[]>>(
    (map, photo) => {
      const existing = map.get(photo.session_id) ?? [];
      existing.push(photo);
      map.set(photo.session_id, existing);
      return map;
    },
    new Map(),
  );
  const visiblePhotoCountBySessionId = new Map(
    photoRows
      .filter((photo) => Boolean(photo.secure_url))
      .map((photo) => [photo.session_id, 1] as const),
  );
  const hasPrimaryFrameBySessionId = photoRows.reduce<Map<string, boolean>>(
    (map, photo) => {
      if (
        photo.kind === "framed" &&
        photo.photo_index === 0 &&
        Boolean(photo.secure_url)
      ) {
        map.set(photo.session_id, true);
      }
      return map;
    },
    new Map(),
  );
  const livePhotoJobBySessionId = new Map(
    livePhotoJobRows.map((job) => [job.session_id, job]),
  );
  const visibleRows = enrichedRows.filter((session) => {
    const livePhotoJob = livePhotoJobBySessionId.get(session.id);
    const showSession = shouldShowGallerySession({
      session,
      photoCount: visiblePhotoCountBySessionId.get(session.id) ?? 0,
      livePhotoJob,
    });
    if (!showSession) return false;
    return (
      hasPrimaryFrameBySessionId.get(session.id) === true ||
      isActiveLivePhotoJob(livePhotoJob)
    );
  });

  const lastRow = rows.at(-1);
  const hasMoreRows = rows.length === INITIAL_GALLERY_PAGE_SIZE;
  const initialCursor =
    hasMoreRows && lastRow
      ? encodeGalleryCursor({ createdAt: lastRow.created_at, id: lastRow.id })
      : null;

  if (visibleRows.length === 0) {
    return (
      <GalleryShareProvider initialSharedGalleries={sharedGalleries}>
        <GalleryEmpty message="Hasil photobooth akan muncul setelah kiosk membuat QR dan menyelesaikan upload." />
      </GalleryShareProvider>
    );
  }

  const sessionsByDate = visibleRows.reduce<
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
    <GalleryShareProvider initialSharedGalleries={sharedGalleries}>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Gallery
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Hasil raw dan framed photo yang diunggah kiosk ke cloud gallery.
            </p>
          </div>
          <GalleryShareHeaderActions />
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
                const framed = photosBySessionId.get(session.id)?.[0] ?? null;
                const livePhotoJob = livePhotoJobBySessionId.get(session.id);

                return (
                  <GallerySessionCard
                    key={session.id}
                    session={session}
                    framed={framed}
                    isLivePhotoProcessing={isActiveLivePhotoJob(livePhotoJob)}
                  />
                );
              })}
            </div>
          </section>
        ))}

        <GalleryLoadMore initialCursor={initialCursor} />
      </div>
    </GalleryShareProvider>
  );
}

function encodeGalleryCursor(cursor: { createdAt: string; id: string }) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function isOrphanQrisPendingTransaction(transaction: TransactionRow) {
  return (
    transaction.provider === "QRIS" &&
    transaction.status === "pending" &&
    !transaction.merchant_order_id
  );
}

function GalleryEmpty({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Gallery
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Hasil raw dan framed photo dari kiosk.
          </p>
        </div>
        <GalleryShareHeaderActions />
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
