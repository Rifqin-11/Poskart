import { FileText, ReceiptText, ShieldCheck } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { PricingCards } from "@/features/billing/pricing/pricing-cards";
import { businessProfile } from "@/lib/constants/business";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";

export default async function PublicPricingPage() {
  const plans = await getPublicSubscriptionPricingPlans();

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      {/* <section className="border-b border-zinc-200 bg-zinc-50">
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
      </section> */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <PricingCards plans={plans} />
        <div className="mt-8 rounded-[28px] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5">
          <div className="space-y-3">
            {[
              {
                icon: ReceiptText,
                title: "Pajak & invoice",
                body: businessProfile.taxNote,
              },
              {
                icon: ShieldCheck,
                title: "Paket fleksibel",
                body: businessProfile.billingNote,
              },
              {
                icon: FileText,
                title: "Alur berlangganan",
                body: businessProfile.purchaseFlow,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <span className="grid size-10 place-items-center rounded-full bg-zinc-950 text-white">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-zinc-950">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
