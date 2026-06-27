"use client";

import { useRouter } from "next/navigation";
import { PricingCards } from "@/features/billing/pricing/pricing-cards";
import { Dialog } from "@/components/ui/dialog";
import { useSubscriptionPlans } from "@/features/admin/pricing/use-pricing";
import { pricingPlans as fallbackPricingPlans } from "@/lib/constants/business";
import { formatCurrency } from "@/lib/utils";

export function SubscriptionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: subscriptionPlans = [], isLoading } = useSubscriptionPlans();
  const plans = subscriptionPlans
    .filter((plan) => plan.isPublic)
    .map((plan) => {
      const durationLabel =
        plan.durationMonths === 1 ? "1 month" : `${plan.durationMonths} months`;
      const deviceLabel =
        plan.includedDevices === 1
          ? "1 device"
          : `${plan.includedDevices} devices`;
      const addOnLabel = `${formatCurrency(plan.additionalDevicePriceMonthly)}/device/month`;
      const fallback = fallbackPricingPlans.find((item) => item.id === plan.id);

      return {
        id: plan.id,
        name: plan.name,
        tierId: fallback?.tierId,
        audience: fallback?.audience,
        price: formatCurrency(plan.basePrice),
        amount: plan.basePrice,
        compareAtAmount: fallback?.compareAtAmount,
        durationMonths: plan.durationMonths,
        includedDevices: plan.includedDevices,
        additionalDevicePriceMonthly: plan.additionalDevicePriceMonthly,
        period: fallback?.period ?? periodLabel(plan.durationMonths),
        duration: `${durationLabel} access`,
        description:
          fallback?.description ??
          `Paket subscription POSKART untuk ${durationLabel} dengan ${deviceLabel}.`,
        cta: fallback?.cta ?? `Subscribe ${plan.name}`,
        highlighted: fallback?.highlighted ?? plan.includedDevices === 3,
        features: fallback?.features ?? [
          "POSKART dashboard",
          "Visual layout builder",
          "Theme and template CMS",
          "QRIS transaction monitoring",
          `${deviceLabel} included`,
          `Additional device ${addOnLabel}`,
        ],
        limits: fallback?.limits ?? [
          `${durationLabel} access`,
          `${deviceLabel} included`,
          `Add-on ${addOnLabel}`,
        ],
      };
    });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change subscription"
      className="max-h-[90vh] max-w-6xl overflow-y-auto"
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">
            Choose a POSKART subscription plan.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Pilih paket langganan tanpa keluar dari dashboard. Setelah memilih
            paket, checkout tetap berjalan di area admin.
          </p>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50"
              />
            ))}
          </div>
        ) : (
          <PricingCards
            plans={plans}
            onSelectPlan={(plan) => {
              onOpenChange(false);
              router.push(
                `/checkout?plan=${encodeURIComponent(plan.id)}&devices=${plan.includedDevices}`,
              );
            }}
          />
        )}
      </div>
    </Dialog>
  );
}

function periodLabel(durationMonths: number) {
  if (durationMonths === 1) return "/bulan";
  if (durationMonths === 12) return "/tahun";
  return `/${durationMonths} bulan`;
}
