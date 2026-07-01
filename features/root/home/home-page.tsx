import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import { HeroSection } from "@/features/root/home/hero-section";
import { ScrollyFeatures } from "@/features/root/home/scrolly-features";
import {
  BentoFeaturesSection,
  CompleteFeaturesSection,
  CTASection,
  SpecsFaqSection,
  WorkflowSection,
} from "@/features/root/home/feature-sections";
import type { PricingPlan } from "@/lib/constants/business";
import type { LatestAppRelease } from "@/features/root/home/api";

export function HomePage({
  plans,
  latestRelease,
}: {
  plans: PricingPlan[];
  latestRelease: LatestAppRelease | null;
}) {
  const starterPlan =
    plans.find((plan) => plan.id === "starter-monthly") ?? plans[0];

  const planLabel = starterPlan
    ? `${starterPlan.name} mulai ${starterPlan.price} untuk ${starterPlan.includedDevices} device.`
    : null;

  return (
    <main className="min-h-screen overflow-clip bg-white text-zinc-950">
      <PublicHeader />

      {/* Hero — image first, text below */}
      <HeroSection latestRelease={latestRelease} />

      {/* Social proof stats strip */}
      <section className="relative z-10 border-y border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-4 py-6 sm:px-6 lg:px-8">
          {[
            { value: "500+", label: "Operator aktif" },
            { value: "10K+", label: "Sesi booth" },
            { value: "98%", label: "QRIS success rate" },
            { value: "4.9★", label: "Rating pengguna" },
          ].map(({ value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-zinc-950">
                {value}
              </span>
              <span className="text-xs text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Scrollytelling feature cards — pasteapp.io style */}
      <ScrollyFeatures />

      {/* Bento feature grid */}
      <BentoFeaturesSection />

      {/* Complete feature and workflow details */}
      <CompleteFeaturesSection />
      <WorkflowSection />
      <SpecsFaqSection />

      {/* CTA */}
      <CTASection planLabel={planLabel} />

      <PublicFooter />
    </main>
  );
}
