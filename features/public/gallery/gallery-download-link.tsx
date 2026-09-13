"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

type GalleryDownloadLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
  pendingLabel?: string;
};

/**
 * Shares media through the native share sheet when file sharing is supported.
 * Browsers without that capability keep the regular attachment download flow.
 */
export function GalleryDownloadLink({
  href,
  children,
  className,
  "aria-label": ariaLabel,
  pendingLabel = "Menyiapkan...",
}: GalleryDownloadLinkProps) {
  const [isSharing, setIsSharing] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (isSharing) {
      event.preventDefault();
      return;
    }

    if (
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function"
    ) {
      return;
    }

    event.preventDefault();
    setIsSharing(true);

    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) throw new Error("Media download failed.");

      const blob = await response.blob();
      const file = new File([blob], getFilename(response, href), {
        type: getMediaType(response, blob),
      });

      if (!navigator.canShare({ files: [file] })) {
        downloadWithBrowser(href);
        return;
      }

      await navigator.share({ files: [file] });
    } catch (error) {
      if (isShareCancelled(error)) return;
      downloadWithBrowser(href);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-busy={isSharing}
      onClick={handleClick}
    >
      {isSharing ? <LoaderCircle className="size-4 animate-spin" /> : children}
      {isSharing && typeof children === "string" ? pendingLabel : null}
    </a>
  );
}

function getFilename(response: Response, href: string) {
  const contentDisposition = response.headers.get("content-disposition");
  const filenameMatch = contentDisposition?.match(
    /filename\*?=(?:UTF-8''|"|')?([^"';]+)["']?/i,
  );

  if (filenameMatch?.[1]) {
    return decodeURIComponent(filenameMatch[1]);
  }

  const extension = getExtension(response.headers.get("content-type"));
  return `poskart-download${extension ? `.${extension}` : getPathExtension(href)}`;
}

function getMediaType(response: Response, blob: Blob) {
  return (
    response.headers.get("content-type")?.split(";")[0] ||
    blob.type ||
    "application/octet-stream"
  );
}

function getExtension(contentType: string | null) {
  const normalizedType = contentType?.split(";")[0].toLowerCase();
  if (normalizedType === "image/jpeg") return "jpg";
  if (normalizedType === "image/png") return "png";
  if (normalizedType === "image/gif") return "gif";
  if (normalizedType === "video/mp4") return "mp4";
  return "";
}

function getPathExtension(href: string) {
  const extension = href.match(/\.([a-z0-9]+)(?:[?#]|$)/i)?.[1];
  return extension ? `.${extension}` : ".jpg";
}

function isShareCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function downloadWithBrowser(href: string) {
  window.location.assign(href);
}
