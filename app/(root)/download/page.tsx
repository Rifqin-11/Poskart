import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { DownloadAppCard } from "@/features/root/download/download-app-card";
import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import { businessProfile } from "@/lib/constants/business";
import {
  getLatestAppRelease,
  RELEASES_PAGE_URL,
} from "@/server/releases/github-release";

export const metadata: Metadata = {
  title: "Download POSKART Kiosk",
  description:
    "Download aplikasi POSKART Kiosk terbaru untuk tablet Android dan lanjutkan proses pairing device.",
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
    minimumFractionDigits: megabytes < 10 ? 1 : 0,
  })} MB`;
}

function formatPublishedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function DownloadPage() {
  const latestRelease = await getLatestAppRelease();

  return (
    <main className="min-h-screen overflow-clip bg-[#f7f9ff] text-zinc-950">
      <PublicHeader variant="landing" />

      <section className="relative isolate px-5 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32 lg:px-12 lg:pb-14">
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -left-36 top-16 size-96 rounded-full bg-blue-100/65 blur-3xl" />
          <div className="absolute -right-28 top-72 size-80 rounded-full bg-red-50 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="mb-9 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00357B]">
              POSKART for Android
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase leading-[0.92] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Siapkan tablet booth Anda.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              Download aplikasi POSKART Kiosk terbaru, instal di tablet Android,
              lalu hubungkan device ke dashboard melalui kode pairing.
            </p>
          </div>

          <DownloadAppCard
            downloadUrl={latestRelease?.downloadUrl ?? null}
            fileName={latestRelease?.fileName ?? null}
            fileSize={
              latestRelease ? formatFileSize(latestRelease.fileSize) : null
            }
            publishedAt={
              latestRelease
                ? formatPublishedDate(latestRelease.publishedAt)
                : null
            }
            releaseUrl={RELEASES_PAGE_URL}
            version={latestRelease?.version ?? null}
          />
        </div>
      </section>

      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
