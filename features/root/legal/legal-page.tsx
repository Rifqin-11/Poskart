import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { buttonVariants } from "@/components/ui/button";
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
    <main className="min-h-dvh overflow-clip bg-[#f7f9ff] text-zinc-950">
      <PublicHeader variant="landing" />

      {/* Hero */}
      <section className="hero-gradient-poskart border-b border-blue-100 px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:px-12">
        <div className="mx-auto max-w-[90rem]">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#00357B]">
            <FileText className="size-3.5" />
            Legal
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black uppercase leading-[0.9] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600">
            {description}
          </p>
          <p className="mt-4 text-xs text-zinc-400">
            Last updated: May 24, 2026
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-8 lg:grid-cols-[0.38fr_1fr] lg:gap-14">
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
                    className="block rounded-xl px-3 py-2 text-sm text-zinc-500 transition hover:bg-blue-50 hover:text-[#00357B]"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {sections.map((section) => (
                <article
                  key={section.title}
                  id={section.title.toLowerCase().replace(/\s+/g, "-")}
                  className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_4px_16px_rgba(0,53,123,0.05)]"
                >
                  <div className="border-b border-blue-50 bg-[#f7f9ff] px-6 py-4">
                    <h2 className="text-sm font-semibold text-zinc-950">
                      {section.title}
                    </h2>
                  </div>
                  <div className="space-y-3 px-6 py-5 text-sm leading-7 text-zinc-600">
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
      <section className="cta-gradient-poskart px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ada pertanyaan terkait dokumen ini?
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
              Hubungi {businessProfile.email} atau {businessProfile.phone} untuk
              klarifikasi lebih lanjut.
            </p>
          </div>
          <Link
            href="/contact"
            className={buttonVariants({
              size: "lg",
              className:
                "h-12 rounded-full bg-white px-6 text-[#00357B] hover:bg-blue-50",
            })}
          >
            Hubungi kami
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>

      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
