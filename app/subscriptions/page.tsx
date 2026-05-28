import { CreditCard } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/layout/public-site-shell";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { businessProfile } from "@/lib/constants/business";
import { getPublicSubscriptionPricingPlans } from "@/lib/subscription-pricing";

export default async function PublicPricingPage() {
  const plans = await getPublicSubscriptionPricingPlans();

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
            <CreditCard className="size-3.5 text-red-500" />
            Public pricing
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Transparent POSKART subscription plans.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-600">
            Pilih paket SaaS untuk mengelola booth photobooth, visual builder, template, transaksi QRIS,
            asset library, dan analytics.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <PricingCards plans={plans} />
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-600">
          <p>{businessProfile.taxNote}</p>
          <p>{businessProfile.billingNote}</p>
          <p>{businessProfile.purchaseFlow}</p>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
