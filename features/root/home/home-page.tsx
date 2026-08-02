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
import { LandingScrollReset } from "@/features/root/home/landing-scroll-reset";
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
      <LandingScrollReset />
      <PublicHeader variant="landing" />
      <HeroSection latestRelease={latestRelease} />
      <ScrollyFeatures />
      <ProductShowcase />
      <WorkflowBand />
      <section
        id="pricing"
        aria-label="Paket langganan POSKART"
        className="scroll-mt-24 border-y border-blue-100 bg-[#f7f9ff]"
      >
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div
            data-home-trial-banner
            className="relative mb-10 overflow-hidden rounded-[28px] border border-[#00357B]/20 bg-[#00357B] text-white shadow-[0_20px_50px_rgba(0,53,123,0.18)] sm:mb-12"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[24px] border-[#C9364A]/20"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-24 size-20 translate-y-1/2 rounded-full bg-[#014EB4]/70 blur-2xl"
            />

            <div className="relative grid gap-6 px-5 py-5 sm:px-7 sm:py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
              <div className="flex items-start gap-4 sm:items-center">
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner shadow-white/10">
                  <span className="text-xl font-black leading-none">14</span>
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-100">
                    hari
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">
                    <span className="size-1.5 rounded-full bg-[#F5A3AE]" />
                    Mulai tanpa kartu kredit
                  </p>
                  <h2 className="mt-1 max-w-2xl text-lg font-semibold leading-7 tracking-tight sm:text-xl">
                    Coba gratis 14 hari — tidak perlu kartu kredit
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm">
                    1 device · Theme builder · QRIS · Gallery · Data tidak dihapus setelah berakhir
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                <a
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-[#00357B] transition-[background-color,transform] duration-200 hover:bg-blue-50 active:translate-y-px"
                >
                  Mulai trial gratis <span className="ml-2 text-base">→</span>
                </a>
                <span className="text-center text-[11px] text-blue-200 sm:px-1 lg:text-right">
                  Siap dalam beberapa menit
                </span>
              </div>
            </div>
          </div>

          <PricingCards plans={plans} />
        </div>
      </section>
      <LandingCTA planLabel={planLabel} />
      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
