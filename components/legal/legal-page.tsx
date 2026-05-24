import { PublicFooter, PublicHeader } from "@/components/layout/public-site-shell";
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
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Payment gateway readiness
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600">{description}</p>
          <p className="mt-4 text-xs text-zinc-500">Last updated: May 24, 2026</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-600">
          Untuk pertanyaan terkait dokumen ini, hubungi {businessProfile.email} atau {businessProfile.phone}.
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
