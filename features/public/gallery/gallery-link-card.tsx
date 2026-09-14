"use client";

import { Check, QrCode, Share2 } from "lucide-react";
import { useState } from "react";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function GalleryLinkCard({ galleryUrl }: { galleryUrl: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Gallery POSKART",
          text: "Lihat foto dari gallery POSKART ini.",
          url: galleryUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Salin link gallery ini:", galleryUrl);
    }
  }

  return (
    <>
      <section className="mt-5 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-900">
            <Share2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Bagikan link gallery</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Buka link ini di perangkat lain atau bagikan ke teman.
            </p>
          </div>
        </div>

        <a
          href={galleryUrl}
          className="mt-4 block truncate rounded-xl bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          title={galleryUrl}
        >
          {galleryUrl}
        </a>

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            className="min-w-0 flex-1 rounded-xl"
            onClick={handleShare}
          >
            {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
            <span>{copied ? "Link tersalin" : "Share link"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-full"
            onClick={() => setQrOpen(true)}
            aria-label="Tampilkan QR code gallery"
            title="Tampilkan QR code"
          >
            <QrCode className="size-4" />
          </Button>
        </div>
      </section>

      <Dialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        title="QR code gallery"
        className="max-w-sm"
      >
        <div className="flex flex-col items-center text-center">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <QRCode
              value={galleryUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#18181b"
            />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-500">
            Scan QR code ini untuk membuka gallery foto.
          </p>
          <p className="mt-2 w-full truncate rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            {galleryUrl}
          </p>
        </div>
      </Dialog>
    </>
  );
}
