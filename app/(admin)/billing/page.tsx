import { CreditCard } from "lucide-react";

import { PricingCards } from "@/components/pricing/pricing-cards";
import { businessProfile } from "@/lib/constants/business";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
          <CreditCard className="size-3.5 text-red-500" />
          Subscription billing
        </div>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight">
          Choose a POSKART subscription plan.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
          Pilih paket langganan tanpa keluar dari dashboard. Setelah memilih paket, checkout tetap berjalan di dalam area admin.
        </p>
      </section>

      <section>
        <PricingCards />
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-600 shadow-sm">
          <p>{businessProfile.taxNote}</p>
          <p>{businessProfile.billingNote}</p>
          <p>{businessProfile.purchaseFlow}</p>
        </div>
      </section>
    </div>
  );
}
