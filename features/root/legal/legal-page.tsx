import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { LandingButton } from "@/components/ui/landing-button";
import { businessProfile } from "@/lib/constants/business";

export type LegalSection = {
  title: string;
  body: string[];
};

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-[#F7F8FA] text-zinc-950">
      <PublicHeader variant="landing" />

      {/* Hero */}
      <section className="bg-[#F7F8FA] px-3 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-10 lg:pb-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/40 bg-[radial-gradient(120%_130%_at_20%_20%,#5FA8FF_0%,#1F6FD0_52%,#014EB4_100%)] px-6 py-12 text-white shadow-[0_28px_70px_rgba(0,53,123,0.22)] sm:rounded-[36px] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                <FileText className="size-3.5" />
                Legal
              </div>
              <h1 className="mt-5 max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)] font-black leading-[1.04] tracking-tight">
                {title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
                {description}
              </p>
              <p className="mt-4 text-xs text-white/60">
                Last updated: May 24, 2026
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-10 lg:grid-cols-[0.38fr_1fr] lg:gap-14">
            {/* Sticky nav */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-1">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                  Daftar isi
                </p>
                {sections.map((section) => (
                  <a
                    key={section.title}
                    href={`#${section.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className="block border-l-2 border-transparent px-3 py-2 text-sm text-zinc-500 transition hover:border-[#014EB4] hover:bg-[#F7F8FA] hover:text-[#00357B]"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {sections.map((section) => (
                <article
                  key={section.title}
                  id={section.title.toLowerCase().replace(/\s+/g, "-")}
                  className="scroll-mt-28 py-8 first:pt-0 last:pb-0"
                >
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F7F8FA] px-3 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="flex flex-col items-start justify-between gap-8 rounded-[28px] border border-white/40 bg-[radial-gradient(140%_130%_at_50%_-20%,#5FA8FF_0%,#014EB4_50%,#00357B_100%)] px-6 py-16 text-white shadow-[0_30px_80px_rgba(0,53,123,0.24)] sm:rounded-[36px] sm:px-12 sm:py-20 lg:flex-row lg:items-center lg:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Ada pertanyaan terkait dokumen ini?
              </h2>
              <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
                Hubungi {businessProfile.email} atau {businessProfile.phone} untuk
                klarifikasi lebih lanjut.
              </p>
            </div>
            <LandingButton
              variant="primary"
              size="lg"
              className="h-14 rounded-2xl"
              asChild
            >
              <Link href="/contact">
                Hubungi kami
                <ArrowUpRight className="size-4" />
              </Link>
            </LandingButton>
          </div>
        </div>
      </section>

      <PublicFooter variant="home" />
    </main>
  );
}
