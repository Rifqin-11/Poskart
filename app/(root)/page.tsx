import { Suspense } from "react";
import { HomePage } from "@/features/root/home/home-page";
import { HomePricing } from "@/features/root/home/home-pricing";
import { HomeReleaseLabel } from "@/features/root/home/home-release-label";

/**
 * The hero must not wait on pricing or release data.
 *
 * Every static section renders immediately, while the version label and the
 * pricing block stream in behind Suspense boundaries. That keeps TTFB low and
 * lets the browser discover the LCP screenshot as early as possible.
 */
export default function Page() {
  return (
    <HomePage
      releaseSlot={
        <Suspense fallback={<VersionPlaceholder />}>
          <HomeReleaseLabel />
        </Suspense>
      }
      pricingSlot={
        <Suspense fallback={<PricingSkeleton />}>
          <HomePricing />
        </Suspense>
      }
    />
  );
}

function VersionPlaceholder() {
  return (
    <span className="ml-auto hidden text-[10px] font-medium text-zinc-400 sm:block">
      POSKART
    </span>
  );
}

function PricingSkeleton() {
  return (
    <section
      id="pricing"
      aria-hidden="true"
      className="scroll-mt-24 border-y border-blue-100 bg-[#f7f9ff]"
    >
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="h-40 animate-pulse rounded-[28px] bg-[#00357B]/10" />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="min-h-[420px] animate-pulse rounded-[28px] border border-blue-100 bg-white"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
