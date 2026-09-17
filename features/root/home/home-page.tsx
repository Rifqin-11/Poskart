import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import { HeroSection } from "@/features/root/home/hero-section";
import { ScrollyFeatures } from "@/features/root/home/scrolly-features";
import {
  LandingCTA,
  LandingFAQ,
  ProductShowcase,
  WorkflowBand,
} from "@/features/root/home/landing-sections";

/**
 * Server-rendered landing shell.
 *
 * Every section below the hero is static markup. Data-dependent blocks are
 * injected as slots so the hero can be sent (and its LCP screenshot discovered)
 * before pricing is resolved. This component deliberately performs no
 * data fetching of its own.
 */
export function HomePage({
  releaseSlot,
  pricingSlot,
}: {
  releaseSlot?: React.ReactNode;
  pricingSlot: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-clip bg-[#f7f9ff] text-zinc-950">
      <PublicHeader variant="landing" />
      <HeroSection releaseSlot={releaseSlot} />
      <ScrollyFeatures />
      <ProductShowcase />
      <WorkflowBand />
      {pricingSlot}
      <LandingFAQ />
      <LandingCTA planLabel={null} />
      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
