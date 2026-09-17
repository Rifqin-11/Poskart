import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage } from "@/features/root/home/home-page";
import { HomePricing } from "@/features/root/home/home-pricing";
import { PoskartStructuredData } from "@/app/structured-data";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

/**
 * The hero must not wait on pricing data.
 *
 * Every static section renders immediately, while the pricing block streams in
 * behind a Suspense boundary. That keeps TTFB low and lets the browser discover
 * the LCP screenshot as early as possible.
 */
export default function Page() {
  return (
    <>
      {/* Structured Data for SEO */}
      <PoskartStructuredData />

      <HomePage
        pricingSlot={
          <Suspense fallback={<PricingSkeleton />}>
            <HomePricing />
          </Suspense>
        }
      />
    </>
  );
}

function PricingSkeleton() {
  return (
    <section
      id="pricing"
      aria-hidden="true"
      className="scroll-mt-24 bg-white py-12 sm:py-16 lg:py-16"
    >
      <div className="mx-auto max-w-[90rem] px-5 lg:px-12">
        <div className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="min-h-[280px] animate-pulse rounded-2xl border border-zinc-200 bg-white"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
