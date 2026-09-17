import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import { HeroSection } from "@/features/root/home/hero-section";
import { GettingStartedSection } from "@/features/root/home/getting-started-section";
import { PlatformSection } from "@/features/root/home/platform-section";
import { AdvantagesSection } from "@/features/root/home/advantages-section";
import { OfflineSection } from "@/features/root/home/offline-section";
import { ProductFeaturesSection } from "@/features/root/home/product-features-section";
import { HomeClosingSequence } from "@/features/root/home/home-closing-sequence";
import { LandingCTA, LandingFAQ } from "@/features/root/home/landing-sections";

/**
 * Server-rendered landing shell.
 *
 * Every section below the hero is static markup. Data-dependent blocks are
 * injected as slots so the hero can be sent (and its LCP screenshot discovered)
 * before pricing is resolved. This component deliberately performs no
 * data fetching of its own.
 */
export function HomePage({
  pricingSlot,
}: {
  pricingSlot: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#F7F8FA] text-zinc-950">
      <PublicHeader variant="landing" />
      <HeroSection />
      <GettingStartedSection />
      <PlatformSection />
      <AdvantagesSection />
      <OfflineSection />
      <ProductFeaturesSection />
      {pricingSlot}
      <LandingFAQ />
      <HomeClosingSequence
        cta={<LandingCTA />}
        footer={<PublicFooter variant="home" />}
      />
    </main>
  );
}
