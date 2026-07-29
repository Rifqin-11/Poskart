import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import { HeroSection } from "@/features/root/home/hero-section";
import { ScrollyFeatures } from "@/features/root/home/scrolly-features";
import {
  LandingCTA,
  ProductShowcase,
  WorkflowBand,
} from "@/features/root/home/landing-sections";
import { PricingCards } from "@/features/billing/pricing/pricing-cards";
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
    <main className="min-h-screen overflow-clip bg-[#f7f9ff] text-zinc-950">
      <PublicHeader variant="landing" />
      <HeroSection latestRelease={latestRelease} />
      <ScrollyFeatures />
      <ProductShowcase />
      <WorkflowBand />
      <section
        id="pricing"
        aria-label="Paket langganan POSKART"
        className="scroll-mt-24 border-y border-blue-100 bg-white"
      >
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <PricingCards plans={plans} />
        </div>
      </section>
      <LandingCTA planLabel={planLabel} />
      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
