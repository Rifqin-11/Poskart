import { PricingCards } from "@/features/billing/pricing/pricing-cards";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";

/**
 * Async pricing block rendered behind a Suspense boundary.
 *
 * Keeping the pricing query out of the landing page's top-level props means the
 * hero HTML does not wait on the database.
 */
export async function HomePricing() {
  const plans = await getPublicSubscriptionPricingPlans();

  return (
    <section
      id="pricing"
      aria-label="Paket langganan POSKART"
      className="scroll-mt-24 bg-white py-12 sm:py-16 lg:py-16"
    >
      <div className="mx-auto max-w-[90rem] px-5 lg:px-12">
        <PricingCards plans={plans} />
      </div>
    </section>
  );
}
