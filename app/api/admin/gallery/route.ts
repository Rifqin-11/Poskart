import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  isActiveLivePhotoJob,
  shouldShowGallerySession,
} from "@/lib/gallery/session-visibility";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 60;

type GallerySessionRow = {
  id: string;
  device_id: string | null;
  template_name: string;
  social_media_consent: boolean;
  test_mode: boolean;
  share_url: string | null;
  created_at: string;
};

type TransactionRow = {
  id: string;
  status: string | null;
  provider: string | null;
  merchant_order_id: string | null;
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

type GalleryCursor = {
  createdAt: string;
  id: string;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.organization_id) {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const limit = clampLimit(request.nextUrl.searchParams.get("limit"));
  const cursor = decodeCursor(request.nextUrl.searchParams.get("cursor"));

  let query = supabase
    .from("gallery_sessions")
    .select(
      "id,device_id,template_name,social_media_consent,test_mode,share_url,created_at",
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (cursor) {
    // Keep the ordering stable when multiple sessions share the same timestamp.
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data: sessions, error: sessionsError } = await query;
  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  const rows = (sessions ?? []) as GallerySessionRow[];
  const sessionIds = rows.map((session) => session.id);
  if (sessionIds.length === 0) {
    return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
  }

  const [{ data: transactions }, { data: primaryFrames }, { data: livePhotoJobs }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id,status,provider,merchant_order_id")
        .eq("organization_id", membership.organization_id)
        .in("id", sessionIds),
      supabase
        .from("gallery_photos")
        .select("id,session_id,kind,photo_index,secure_url,format")
        .eq("organization_id", membership.organization_id)
        .in("session_id", sessionIds)
        .eq("kind", "framed")
        .eq("photo_index", 0),
      supabase
        .from("live_photo_render_jobs")
        .select("session_id,status,updated_at")
        .eq("organization_id", membership.organization_id)
        .in("session_id", sessionIds),
    ]);

  const transactionRows = (transactions ?? []) as TransactionRow[];
  const transactionIds = new Set(
    transactionRows
      .filter((transaction) => !isOrphanQrisPendingTransaction(transaction))
      .map((transaction) => transaction.id),
  );
  const photoRows = (primaryFrames ?? []) as GalleryPhotoRow[];
  const livePhotoJobRows = (livePhotoJobs ?? []) as LivePhotoJobRow[];
  const livePhotoJobBySessionId = new Map(
    livePhotoJobRows.map((job) => [job.session_id, job]),
  );
  const hasPrimaryFrameBySessionId = new Set(
    photoRows
      .filter((photo) => Boolean(photo.secure_url))
      .map((photo) => photo.session_id),
  );

  const items = rows
    .filter((session) => transactionIds.has(session.id) || session.test_mode)
    .filter((session) => {
      const livePhotoJob = livePhotoJobBySessionId.get(session.id);
      if (
        !shouldShowGallerySession({
          session,
          photoCount: hasPrimaryFrameBySessionId.has(session.id) ? 1 : 0,
          livePhotoJob,
        })
      ) {
        return false;
      }

      return (
        hasPrimaryFrameBySessionId.has(session.id) ||
        isActiveLivePhotoJob(livePhotoJob)
      );
    })
    .map((session) => ({
      ...session,
      transaction_id: session.test_mode ? null : session.id,
      framed: photoRows.find((photo) => photo.session_id === session.id) ?? null,
      isLivePhotoProcessing: isActiveLivePhotoJob(
        livePhotoJobBySessionId.get(session.id),
      ),
    }));

  const lastRow = rows.at(-1);
  const hasMore = rows.length === limit;
  return NextResponse.json({
    items,
    nextCursor:
      hasMore && lastRow
        ? encodeCursor({ createdAt: lastRow.created_at, id: lastRow.id })
        : null,
    hasMore,
  });
}

function clampLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function encodeCursor(cursor: GalleryCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string | null): GalleryCursor | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<GalleryCursor>;
    if (
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      return null;
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function isOrphanQrisPendingTransaction(transaction: TransactionRow) {
  return (
    transaction.provider === "QRIS" &&
    transaction.status === "pending" &&
    !transaction.merchant_order_id
  );
}
