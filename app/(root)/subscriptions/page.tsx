import { FileText, ReceiptText, ShieldCheck } from "lucide-react";
import { PublicPageShell } from "@/features/root/shell/public-site-shell";
import { PricingCards } from "@/features/billing/pricing/pricing-cards";
import { businessProfile } from "@/lib/constants/business";
import { getPublicSubscriptionPricingPlans } from "@/server/subscription/pricing";

export default async function PublicPricingPage() {
  const plans = await getPublicSubscriptionPricingPlans();

  return (
    <PublicPageShell>
      <section className="mx-auto max-w-[90rem] px-5 pb-20 pt-32 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mb-12 border-b border-zinc-300 pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Public pricing
          </p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black uppercase leading-[0.9] tracking-normal sm:text-7xl lg:text-8xl">
            Choose the operating plan for your booth.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600">
            Pilih paket SaaS untuk mengelola booth photobooth, visual builder,
            template, transaksi QRIS, asset library, dan analytics.
          </p>
        </div>
        <PricingCards plans={plans} />
        <div className="mt-12 border-y border-zinc-300 py-8">
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
                  className="border border-zinc-300 bg-white p-5 sm:p-6"
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
    </PublicPageShell>
  );
}
