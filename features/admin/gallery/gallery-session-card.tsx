"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, ExternalLink, ImageIcon, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { DeleteSessionButton } from "@/app/(admin)/gallery/delete-button";
import { PrintSessionButton } from "@/app/(admin)/gallery/print-button";

type GalleryPhoto = {
  id: string;
  session_id: string;
  kind: "raw" | "framed";
  photo_index: number;
  secure_url: string;
  format: string | null;
};

type GallerySession = {
  id: string;
  device_id: string | null;
  transaction_id: string | null;
  template_name: string;
  social_media_consent: boolean;
  test_mode: boolean;
  share_url: string | null;
  created_at: string;
};

type GalleryDetails = {
  photos: GalleryPhoto[];
  livePhotoJob: { status: string | null; updated_at: string | null } | null;
};

export function GallerySessionCard({
  session,
  framed,
  isLivePhotoProcessing,
}: {
  session: GallerySession;
  framed: GalleryPhoto | null;
  isLivePhotoProcessing: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [details, setDetails] = useState<GalleryDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    let cancelled = false;
    const loadDetails = async () => {
      if (details || isLoadingDetails) return;
      setIsLoadingDetails(true);
      try {
        const response = await fetch(
          `/api/admin/gallery/session/${encodeURIComponent(session.id)}`,
          { credentials: "same-origin" },
        );
        if (!response.ok) return;
        const nextDetails = (await response.json()) as GalleryDetails;
        if (!cancelled) setDetails(nextDetails);
      } catch {
        // The primary frame remains usable if optional card details fail.
      } finally {
        if (!cancelled) setIsLoadingDetails(false);
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      void loadDetails();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadDetails();
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [details, isLoadingDetails, session.id]);

  const photos = details?.photos ?? [];
  const motionAsset = photos.find(
    (photo) => photo.kind === "raw" && photo.photo_index === 98,
  );
  const framedLivePhoto = photos.find(
    (photo) => photo.kind === "framed" && photo.photo_index === 1,
  );
  const rawCount = details
    ? photos.filter(
        (photo) =>
          photo.kind === "raw" &&
          photo.photo_index !== 98 &&
          photo.photo_index !== 99,
      ).length
    : null;
  const motionAssetLabel = getMotionAssetLabel(motionAsset);
  const processing =
    isLivePhotoProcessing ||
    (!details && isLoadingDetails && !framedLivePhoto && !motionAsset);

  return (
    <div ref={cardRef}>
      <Card className="group overflow-hidden rounded-xl border-zinc-200 py-0 shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] bg-zinc-100">
          {framed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={framed.secure_url}
              alt={session.template_name || "POSKART session"}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="grid size-full place-items-center text-zinc-400">
              <ImageIcon className="size-7" />
            </div>
          )}
          {motionAsset && (
            <Link
              href={session.share_url || `/s/${session.id}`}
              target="_blank"
              className="absolute right-2 bottom-2 size-16 overflow-hidden rounded-lg border-2 border-white bg-zinc-900 shadow-md"
              aria-label={`Buka ${motionAssetLabel} sesi`}
            >
              <GalleryAssetPreview
                asset={motionAsset}
                alt={`${motionAssetLabel} sesi`}
                className="size-full object-cover"
              />
              <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                {motionAssetLabel}
              </span>
            </Link>
          )}
          {processing && (
            <div className="absolute inset-0 grid place-items-center bg-white/20">
              <Loader2 className="size-5 animate-spin text-zinc-500" />
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
                {rawCount === null ? "… raw" : `${rawCount} raw`}
                {motionAsset ? ` · ${motionAssetLabel}` : ""}
                {framedLivePhoto ? " · Live Photo" : ""}
                {isLivePhotoProcessing ? " · Processing" : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
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
          <div className="mt-2 space-y-0.5 text-[11px] text-zinc-400">
            <p className="truncate">
              Device ID: {session.device_id || "Unknown device"}
            </p>
            <p className="truncate">
              Transaction ID:{" "}
              {session.test_mode ? "Test Mode" : session.transaction_id || "-"}
            </p>
          </div>
          {session.social_media_consent && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <CircleCheck className="size-3.5" />
              Setuju sosial media
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function GalleryAssetPreview({
  asset,
  alt,
  className,
}: {
  asset: Pick<GalleryPhoto, "secure_url" | "format">;
  alt: string;
  className?: string;
}) {
  if (isVideoAsset(asset)) {
    return (
      <video
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={asset.secure_url} type={getVideoMimeType(asset)} />
        {alt}
      </video>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.secure_url} alt={alt} className={className} />;
}

function getMotionAssetLabel(
  asset: Pick<GalleryPhoto, "secure_url" | "format"> | null | undefined,
) {
  if (!asset) return "GIF";
  const format = getAssetFormat(asset);
  if (format === "mp4") return "MP4";
  if (format === "webm") return "WEBM";
  if (format === "mov") return "MOV";
  return "GIF";
}

function isVideoAsset(asset: Pick<GalleryPhoto, "secure_url" | "format">) {
  return ["mp4", "webm", "mov"].includes(getAssetFormat(asset));
}

function getVideoMimeType(asset: Pick<GalleryPhoto, "secure_url" | "format">) {
  const format = getAssetFormat(asset);
  if (format === "webm") return "video/webm";
  if (format === "mov") return "video/quicktime";
  return "video/mp4";
}

function getAssetFormat(asset: Pick<GalleryPhoto, "secure_url" | "format">) {
  const fromFormat = asset.format?.trim().toLowerCase();
  if (fromFormat) return fromFormat;
  const extension = asset.secure_url.split("?")[0]?.split(".").pop();
  return extension?.toLowerCase() ?? "";
}
