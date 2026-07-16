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
    <main className="min-h-screen overflow-clip bg-[#ececea] text-zinc-950">
      <PublicHeader variant="landing" />
      <HeroSection latestRelease={latestRelease} />
      <ScrollyFeatures />
      <ProductShowcase />
      <WorkflowBand />
      <LandingCTA planLabel={planLabel} />
      <PublicFooter />
    </main>
  );
}
