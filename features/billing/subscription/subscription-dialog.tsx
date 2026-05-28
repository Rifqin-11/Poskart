"use client";

import { PricingCards } from "@/features/billing/pricing/pricing-cards";
import { Dialog } from "@/components/ui/dialog";
import { useSubscriptionPlans } from "@/features/admin/pricing/use-pricing";
import { formatCurrency } from "@/lib/utils";

export function SubscriptionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: subscriptionPlans = [], isLoading } = useSubscriptionPlans();
  const plans = subscriptionPlans
    .filter((plan) => plan.isPublic)
    .map((plan) => {
      const durationLabel =
        plan.durationMonths === 1 ? "1 month" : `${plan.durationMonths} months`;
      const deviceLabel =
        plan.includedDevices === 1 ? "1 device" : `${plan.includedDevices} devices`;
      const addOnLabel = `${formatCurrency(plan.additionalDevicePriceMonthly)}/device/month`;

      return {
        id: plan.id,
        name: plan.name,
        price: formatCompactCurrency(plan.basePrice),
        amount: plan.basePrice,
        durationMonths: plan.durationMonths,
        includedDevices: plan.includedDevices,
        additionalDevicePriceMonthly: plan.additionalDevicePriceMonthly,
        period: periodLabel(plan.durationMonths),
        duration: `${durationLabel} access`,
        description: `Paket subscription POSKART untuk ${durationLabel} dengan ${deviceLabel}.`,
        cta: `Subscribe ${plan.name}`,
        highlighted: plan.id === "yearly",
        features: [
          "POSKART dashboard",
          "Visual layout builder",
          "Theme and template CMS",
          "QRIS transaction monitoring",
          `${deviceLabel} included`,
          `Additional device ${addOnLabel}`,
        ],
        limits: [`${durationLabel} access`, `${deviceLabel} included`, `Add-on ${addOnLabel}`],
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
          <h3 className="text-2xl font-semibold tracking-tight">Choose a POSKART subscription plan.</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Pilih paket langganan tanpa keluar dari dashboard. Setelah memilih paket, checkout tetap berjalan di area admin.
          </p>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50" />
            ))}
          </div>
        ) : (
          <PricingCards plans={plans} />
        )}
      </div>
    </Dialog>
  );
}

function periodLabel(durationMonths: number) {
  if (durationMonths === 1) return "/month";
  if (durationMonths === 12) return "/year";
  return `/${durationMonths} months`;
}

function formatCompactCurrency(amount: number) {
  if (amount >= 1000 && amount % 1000 === 0) {
    return `Rp ${amount / 1000}K`;
  }

  return formatCurrency(amount);
}
