"use client";

import { Download, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { GalleryDownloadLink } from "./gallery-download-link";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";

type PreviewPhoto = { id: string; isVideo: boolean };

export function GalleryPhotoViewer({
  sessionId,
  photos,
  initialPhotoId,
  children,
}: {
  sessionId: string;
  photos: PreviewPhoto[];
  initialPhotoId?: string;
  children: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(initialPhotoId);
  const selectedPhoto = photos.find((photo) => photo.id === selectedId);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useScrollLock(Boolean(selectedPhoto));

  function close() {
    setSelectedId(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    const syncFromUrl = () => {
      setSelectedId(new URL(window.location.href).searchParams.get("view") ?? undefined);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(undefined);
        const url = new URL(window.location.href);
        url.searchParams.delete("view");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      if (event.key === "Tab") {
        const controls = closeRef.current?.parentElement?.querySelectorAll<HTMLElement>(
          'button, a[href], video[controls]',
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [selectedPhoto]);

  function openPreview(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[data-gallery-preview]");
    if (!link) return;
    const photoId = new URL(link.href).searchParams.get("view");
    if (!photos.some((photo) => photo.id === photoId)) return;
    event.preventDefault();
    triggerRef.current = link;
    setSelectedId(photoId ?? undefined);
    const url = new URL(window.location.href);
    url.searchParams.set("view", photoId!);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const baseUrl = `/s/${encodeURIComponent(sessionId)}`;

  return (
    <div onClick={openPreview}>
      {children}
      {selectedPhoto && (
        <div role="dialog" aria-modal="true" aria-label="Pratinjau foto" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <button ref={closeRef} type="button" data-gallery-button onClick={close} className="gallery-preview-button absolute left-6 top-6 grid size-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20" aria-label="Tutup">
            <X className="size-6" />
          </button>
          <GalleryDownloadLink href={`${baseUrl}/download/${selectedPhoto.id}`} className="gallery-preview-button absolute right-6 top-6 flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
            <Download className="size-4" />Download
          </GalleryDownloadLink>
          <div className="relative max-h-[80vh] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl">
            {selectedPhoto.isVideo ? (
              <video key={selectedPhoto.id} src={`${baseUrl}/media/${selectedPhoto.id}`} controls muted loop playsInline preload="metadata" className="max-h-[80vh] max-w-[90vw] object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${baseUrl}/media/${selectedPhoto.id}`} alt="Pratinjau foto" className="max-h-[80vh] max-w-[90vw] object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
