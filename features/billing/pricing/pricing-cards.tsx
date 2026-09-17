"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LandingButton } from "@/components/ui/landing-button";
import {
  PRICING_DURATION_OPTIONS,
  PRICING_TIERS,
  pricingPlans as fallbackPricingPlans,
  type PricingPlan,
  type PricingTierId,
} from "@/lib/constants/business";
import { cn, formatCurrency } from "@/lib/utils";

export function PricingCards({
  plans = fallbackPricingPlans,
  onSelectPlan,
}: {
  plans?: PricingPlan[];
  onSelectPlan?: (plan: PricingPlan) => void;
}) {
  const visiblePlans = plans.length > 0 ? plans : fallbackPricingPlans;
  const [activeDuration, setActiveDuration] = useState(
    visiblePlans.find((plan) => plan.durationMonths === 1)?.durationMonths ??
      visiblePlans[0]?.durationMonths ??
      1,
  );
  const durationTabsRef = useRef<HTMLDivElement>(null);
  const monthlyPlans = useMemo(
    () => visiblePlans.filter((plan) => plan.durationMonths === 1),
    [visiblePlans],
  );
  const activePlans = useMemo(
    () =>
      visiblePlans
        .filter((plan) => plan.durationMonths === activeDuration)
        .sort(comparePlansByTier),
    [activeDuration, visiblePlans],
  );

  const hasMountedRef = useRef(false);
  useEffect(() => {
    // Never scroll on first render: `scrollIntoView` on a below-the-fold
    // element forces a document-level scroll and layout recalculation while
    // other sections are still initialising.
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const container = durationTabsRef.current;
    const activeTab = container?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    if (!container || !activeTab) return;
    // Only the tab strip scrolls horizontally.
    container.scrollTo({
      left: activeTab.offsetLeft - (container.clientWidth - activeTab.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [activeDuration]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          Paket POSKART
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
          Pilih berdasarkan jumlah device.
        </h2>
        <p className="text-sm text-zinc-500">
          Semua paket mendapatkan fitur utama POSKART.
        </p>

        <div
          ref={durationTabsRef}
          className="flex w-full max-w-2xl touch-pan-x snap-x snap-mandatory flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-full border border-zinc-200 bg-zinc-200 p-1 shadow-sm backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Durasi langganan"
        >
          {PRICING_DURATION_OPTIONS.map((duration) => {
            const active = activeDuration === duration.months;

            return (
              <button
                key={duration.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveDuration(duration.months);
                }}
                className={cn(
                  "h-10 min-w-[100px] flex-1 shrink-0 snap-center rounded-full px-3 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#014EB4] focus-visible:ring-offset-2",
                  active
                    ? "bg-[#014EB4] text-white shadow-md ring-1 ring-[#014EB4]/20"
                    : "text-zinc-500 hover:bg-white/60 hover:text-zinc-950",
                )}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trial note */}
      <div className="text-center">
        <p className="text-xs text-zinc-500">
          14 hari gratis · Tanpa kartu kredit · Mulai dengan 1 device
        </p>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-4 xl:gap-6">
        {activePlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            monthlyPlans={monthlyPlans}
            onSelectPlan={onSelectPlan}
          />
        ))}
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  monthlyPlans,
  onSelectPlan,
}: {
  plan: PricingPlan;
  monthlyPlans: PricingPlan[];
  onSelectPlan?: (plan: PricingPlan) => void;
}) {
  const tier = getTierMeta(plan);
  const monthlyEquivalent = getMonthlyEquivalent(plan);
  const monthlyDeviceEquivalent = getMonthlyDeviceEquivalent(plan);
  const monthlyBenchmark = getMonthlyBenchmark(monthlyPlans, plan);
  const durationSavingsPercent = getSavingsPercent(
    monthlyBenchmark,
    monthlyEquivalent,
  );
  const promoSavingsPercent = getSavingsPercent(
    plan.compareAtAmount ?? null,
    plan.amount,
  );
  const savingsPercent = promoSavingsPercent || durationSavingsPercent;

  return (
    <article className={cn(
      "relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 lg:p-7",
      plan.highlighted
        ? "border-[#014EB4] ring-1 ring-[#014EB4]/15"
        : "border-zinc-200",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-zinc-900">{plan.name}</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {plan.audience ?? tier?.audience ?? plan.description}
          </p>
        </div>
        {plan.highlighted ? (
          <span className="rounded-full bg-[#E8F0FE] px-2.5 py-1 text-xs font-medium text-[#014EB4] ring-1 ring-inset ring-[#014EB4]/20">
            Paling populer
          </span>
        ) : null}
      </div>

      <div className="mt-7 min-h-[88px]">
        {plan.compareAtAmount ? (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-lg font-medium line-through",
              )}
            >
              {formatCurrency(plan.compareAtAmount)}
            </span>
            {promoSavingsPercent > 0 ? (
              <span
                className={
                  "rounded-full bg-red-50 text-red-700 px-2.5 py-1 text-xs font-semibold"
                }
              >
                Diskon {promoSavingsPercent}%
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatCurrency(plan.amount)}
          </span>
          <span className="pb-1 text-sm text-zinc-500">
            {plan.period}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {plan.includedDevices} device termasuk
        {!plan.compareAtAmount && savingsPercent > 0
          ? ` · hemat ${savingsPercent}%`
          : ""}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Efektif {formatCurrency(monthlyDeviceEquivalent)}/bulan/device
      </p>

      {onSelectPlan ? (
        <LandingButton
          type="button"
          onClick={() => onSelectPlan(plan)}
          className="mt-7 w-full"
          size="md"
        >
          {plan.cta} <ArrowRight className="size-4" />
        </LandingButton>
      ) : (
        <LandingButton asChild className="mt-7 w-full" size="md">
          <Link href={`/checkout?plan=${encodeURIComponent(plan.id)}`}>
            {plan.cta} <ArrowRight className="size-4" />
          </Link>
        </LandingButton>
      )}

      <div className="mt-7 border-t border-zinc-200 pt-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Termasuk
        </p>
        <ul className="space-y-3">
          {plan.features.slice(0, 7).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-zinc-600">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#014EB4]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs leading-5 text-zinc-500">
          Device tambahan {formatCurrency(plan.additionalDevicePriceMonthly)}/bulan/device.
        </p>
      </div>
    </article>
  );
}

function comparePlansByTier(left: PricingPlan, right: PricingPlan) {
  return getTierIndex(left) - getTierIndex(right);
}

function getTierIndex(plan: PricingPlan) {
  const tierId = getTierId(plan);
  const index = PRICING_TIERS.findIndex((tier) => tier.id === tierId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getTierId(plan: PricingPlan): PricingTierId | undefined {
  if (plan.tierId) return plan.tierId;
  if (plan.id.startsWith("starter-")) return "starter";
  if (plan.id.startsWith("growth-")) return "growth";
  if (plan.id.startsWith("business-")) return "business";
  if (plan.includedDevices <= 1) return "starter";
  if (plan.includedDevices <= 3) return "growth";
  return "business";
}

function getTierMeta(plan: PricingPlan) {
  const tierId = getTierId(plan);
  return PRICING_TIERS.find((tier) => tier.id === tierId);
}

function getMonthlyEquivalent(plan: PricingPlan) {
  return Math.round(plan.amount / Math.max(1, plan.durationMonths));
}

function getMonthlyDeviceEquivalent(plan: PricingPlan) {
  return Math.round(
    plan.amount /
      Math.max(1, plan.durationMonths) /
      Math.max(1, plan.includedDevices),
  );
}

function getMonthlyBenchmark(monthlyPlans: PricingPlan[], plan: PricingPlan) {
  const tierId = getTierId(plan);
  const sameTierMonthly = monthlyPlans.find(
    (item) => getTierId(item) === tierId,
  );
  return sameTierMonthly ? getMonthlyEquivalent(sameTierMonthly) : null;
}

function getSavingsPercent(benchmark: number | null, currentAmount: number) {
  if (!benchmark || benchmark <= 0 || currentAmount >= benchmark) return 0;
  return Math.round((1 - currentAmount / benchmark) * 100);
}
