"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { GallerySessionCard } from "@/features/admin/gallery/gallery-session-card";

type GalleryPhoto = {
  id: string;
  session_id: string;
  kind: "raw" | "framed";
  photo_index: number;
  secure_url: string;
  format: string | null;
};

type GalleryItem = {
  id: string;
  device_id: string | null;
  transaction_id: string | null;
  template_name: string;
  social_media_consent: boolean;
  test_mode: boolean;
  share_url: string | null;
  created_at: string;
  framed: GalleryPhoto | null;
  isLivePhotoProcessing: boolean;
};

type GalleryResponse = {
  items: GalleryItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function GalleryLoadMore({ initialCursor }: { initialCursor: string | null }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(Boolean(initialCursor));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/gallery?limit=40&cursor=${encodeURIComponent(cursor)}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) throw new Error("Gallery could not be loaded.");

      const nextPage = (await response.json()) as GalleryResponse;
      setItems((current) => [...current, ...nextPage.items]);
      setCursor(nextPage.nextCursor);
      setHasMore(nextPage.hasMore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gallery could not be loaded.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const groups = useMemo(() => groupItemsByDate(items), [items]);

  return (
    <>
      {[...groups.entries()].map(([dateKey, group]) => (
        <section key={dateKey} className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold capitalize text-zinc-800">
              {group.label}
            </h2>
            <span className="text-xs text-zinc-400">
              {group.items.length} sesi baru
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {group.items.map((item) => (
              <GallerySessionCard
                key={item.id}
                session={item}
                framed={item.framed}
                isLivePhotoProcessing={item.isLivePhotoProcessing}
              />
            ))}
          </div>
        </section>
      ))}

      <div ref={sentinelRef} className="flex min-h-12 items-center justify-center py-4">
        {isLoading && <Loader2 className="size-5 animate-spin text-zinc-400" />}
        {!isLoading && error && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="text-xs font-medium text-zinc-600 underline underline-offset-4"
          >
            {error} Try again
          </button>
        )}
        {!isLoading && !error && !hasMore && items.length > 0 && (
          <span className="text-xs text-zinc-400">All gallery sessions loaded.</span>
        )}
      </div>
    </>
  );
}

function groupItemsByDate(items: GalleryItem[]) {
  return items.reduce<Map<string, { label: string; items: GalleryItem[] }>>(
    (groups, item) => {
      const date = new Date(item.created_at);
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const year = parts.find((part) => part.type === "year")?.value ?? "1970";
      const month = parts.find((part) => part.type === "month")?.value ?? "01";
      const day = parts.find((part) => part.type === "day")?.value ?? "01";
      const key = `${year}-${month}-${day}`;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, {
          label: new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(date),
          items: [item],
        });
      }
      return groups;
    },
    new Map(),
  );
}
