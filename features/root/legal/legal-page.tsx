import { PublicPageShell } from "@/features/root/shell/public-site-shell";
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
    <PublicPageShell>
      <section className="mx-auto max-w-[90rem] px-5 pb-12 pt-32 sm:px-8 lg:px-12 lg:pb-16">
        <div className="max-w-5xl border-b border-zinc-300 pb-10">
          <div className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Payment gateway readiness
          </div>
          <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-normal sm:text-7xl lg:text-8xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600">
            {description}
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Last updated: May 24, 2026
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-[90rem] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mx-auto max-w-5xl space-y-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="border border-zinc-300 bg-white p-6 sm:p-8"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-5xl border border-zinc-300 bg-white p-5 text-sm leading-7 text-zinc-600 sm:p-6">
          Untuk pertanyaan terkait dokumen ini, hubungi {businessProfile.email}{" "}
          atau {businessProfile.phone}.
        </div>
      </section>
    </PublicPageShell>
  );
}
