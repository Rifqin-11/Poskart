"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
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

  useEffect(() => {
    const activeTab =
      durationTabsRef.current?.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
    activeTab?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeDuration]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-5 text-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
            POSKART Plans
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Choose a plan based on device count and duration.
          </h2>
        </div>

        <div
          ref={durationTabsRef}
          className="flex w-full max-w-2xl touch-pan-x snap-x snap-mandatory flex-nowrap gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-full border border-zinc-200/90 bg-zinc-200/60 p-1 shadow-[0_10px_26px_rgba(15,23,42,0.06)] backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Billing duration"
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
                  "h-11 min-w-[140px] flex-1 shrink-0 snap-center rounded-full px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2",
                  active
                    ? "bg-white text-[#00357B] shadow-[0_3px_10px_rgba(15,23,42,0.14)] ring-1 ring-[#00357B]/10"
                    : "text-zinc-500 hover:bg-white/60 hover:text-zinc-950",
                )}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
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
  const featured = plan.highlighted;

  return (
    <article
      className={cn(
        "relative flex min-h-[610px] flex-col overflow-hidden rounded-[28px] border p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-[transform,border-color,box-shadow] duration-200 lg:p-7",
        featured
          ? "z-10 border-[#00357B] bg-gradient-to-b from-[#064891] to-[#002B63] text-white shadow-[0_24px_50px_rgba(0,53,123,0.24)] lg:-translate-y-5"
          : "border-blue-100 bg-white text-zinc-950 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_38px_rgba(0,53,123,0.1)] lg:mt-5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">{plan.name}</h3>
          <p
            className={cn(
              "mt-1 text-xs leading-5",
              featured ? "text-blue-100" : "text-zinc-500",
            )}
          >
            {plan.audience ?? tier?.audience ?? plan.description}
          </p>
        </div>
        {plan.highlighted ? (
          <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
            Popular
          </span>
        ) : null}
      </div>

      <div className="mt-7 min-h-[92px]">
        {plan.compareAtAmount ? (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-lg font-medium line-through",
                featured ? "text-blue-200" : "text-zinc-400",
              )}
            >
              {formatCurrency(plan.compareAtAmount)}
            </span>
            {promoSavingsPercent > 0 ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  featured
                    ? "bg-red-400/15 text-red-100"
                    : "bg-red-50 text-red-700",
                )}
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
          <span
            className={
              featured
                ? "pb-1 text-sm text-blue-100"
                : "pb-1 text-sm text-zinc-500"
            }
          >
            {plan.period}
          </span>
        </div>
      </div>

      <p
        className={
          featured ? "mt-2 text-xs text-blue-100" : "mt-2 text-xs text-zinc-500"
        }
      >
        {formatCurrency(monthlyDeviceEquivalent)}/mo/device
        {!plan.compareAtAmount && savingsPercent > 0
          ? ` · hemat ${savingsPercent}%`
          : ""}
      </p>

      {plan.compareAtAmount && savingsPercent > 0 ? (
        <p
          className={
            featured
              ? "mt-1 text-xs text-blue-100"
              : "mt-1 text-xs text-zinc-500"
          }
        >
          Hemat dari harga normal {formatCurrency(plan.compareAtAmount)}
        </p>
      ) : null}

      <p
        className={
          featured
            ? "mt-5 text-sm leading-6 text-blue-50"
            : "mt-5 text-sm leading-6 text-zinc-500"
        }
      >
        {plan.description}
      </p>

      {onSelectPlan ? (
        <button
          type="button"
          onClick={() => onSelectPlan(plan)}
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: cn(
              "mt-6 w-full rounded-xl",
              featured
                ? "border-white bg-white text-[#00357B] hover:bg-blue-50 hover:text-[#00357B]"
                : "border-[#00357B] bg-white text-[#00357B] hover:bg-blue-50 hover:text-[#00357B]",
            ),
          })}
        >
          {plan.cta}
          <ArrowRight className="size-4" />
        </button>
      ) : (
        <Link
          href={`/checkout?plan=${plan.id}`}
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: cn(
              "mt-6 w-full rounded-xl",
              featured
                ? "border-white bg-white text-[#00357B] hover:bg-blue-50 hover:text-[#00357B]"
                : "border-[#00357B] bg-white text-[#00357B] hover:bg-blue-50 hover:text-[#00357B]",
            ),
          })}
        >
          {plan.cta}
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div
        className={cn(
          "mt-6 border-t pt-6",
          featured ? "border-white/20" : "border-blue-100",
        )}
      >
        <div
          className={cn(
            "mb-3 text-xs font-medium",
            featured ? "text-blue-100" : "text-zinc-500",
          )}
        >
          Termasuk
        </div>
        <div className="space-y-3">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm">
              <CheckCircle2
                className={
                  featured
                    ? "mt-0.5 size-4 shrink-0 text-blue-100"
                    : "mt-0.5 size-4 shrink-0 text-[#00357B]"
                }
              />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "mt-auto pt-6 text-xs leading-5",
          featured ? "text-blue-100" : "text-zinc-500",
        )}
      >
        Cocok untuk: {plan.audience ?? tier?.audience ?? "operator photobooth"}.
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
