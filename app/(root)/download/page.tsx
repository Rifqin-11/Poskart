import type { Metadata } from "next";
import { DownloadAppCard } from "@/features/root/download/download-app-card";
import {
  PublicFooter,
  PublicHeaderWithSession,
} from "@/features/root/shell/public-site-shell";
import {
  getLatestAppRelease,
  RELEASES_PAGE_URL,
} from "@/server/releases/github-release";

export const metadata: Metadata = {
  title: "Download Receipt Photobooth App Android | POSKART",
  description:
    "Download aplikasi receipt photobooth POSKART untuk tablet Android. Pasang, pairing device, dan mulai jalankan sesi photobooth.",
  alternates: {
    canonical: "/download",
  },
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
    <main className="min-h-screen overflow-x-clip bg-[#F7F8FA] text-zinc-950">
      <PublicHeaderWithSession variant="landing" />

      <section className="bg-[#F7F8FA] px-3 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-10 lg:pb-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/40 bg-[radial-gradient(120%_130%_at_20%_20%,#5FA8FF_0%,#1F6FD0_52%,#014EB4_100%)] px-6 py-12 shadow-[0_28px_70px_rgba(0,53,123,0.22)] sm:rounded-[36px] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <div className="relative z-10 max-w-3xl text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                POSKART for Android
              </p>
              <h1 className="mt-5 max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)] font-black leading-[1.04] tracking-tight">
                Siapkan tablet booth Anda.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
                Download aplikasi POSKART Kiosk terbaru, instal di tablet Android,
                lalu hubungkan device ke dashboard melalui kode pairing.
              </p>
            </div>
          </div>

          <div className="mt-8 lg:mt-10">
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
        </div>
      </section>

      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
