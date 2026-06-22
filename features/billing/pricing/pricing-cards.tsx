"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  defaultPlanId = "starter-monthly",
  plans = fallbackPricingPlans,
}: {
  defaultPlanId?: string;
  plans?: PricingPlan[];
}) {
  const visiblePlans = plans.length > 0 ? plans : fallbackPricingPlans;
  const defaultPlan =
    visiblePlans.find((plan) => plan.id === defaultPlanId) ?? visiblePlans[0];
  const [activeDuration, setActiveDuration] = useState(
    defaultPlan?.durationMonths ?? 1,
  );
  const [activePlanId, setActivePlanId] = useState(
    defaultPlan?.id ?? defaultPlanId,
  );
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

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-center gap-5 text-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
            Paket POSKART
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Pilih paket berdasarkan jumlah device dan durasi.
          </h2>
        </div>

        <div
          className="grid w-full max-w-2xl rounded-full border border-zinc-200 bg-zinc-100/80 p-1 sm:grid-cols-4"
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
                  const nextPlan = visiblePlans
                    .filter((plan) => plan.durationMonths === duration.months)
                    .sort(comparePlansByTier)[0];
                  if (nextPlan) setActivePlanId(nextPlan.id);
                }}
                className={cn(
                  "h-11 rounded-full px-4 text-sm font-medium transition",
                  active
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-950",
                )}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {activePlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            active={activePlanId === plan.id}
            monthlyPlans={monthlyPlans}
            onActivate={() => setActivePlanId(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  active,
  monthlyPlans,
  onActivate,
}: {
  plan: PricingPlan;
  active: boolean;
  monthlyPlans: PricingPlan[];
  onActivate: () => void;
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
    <article
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "min-h-[620px] cursor-pointer rounded-[28px] border p-7 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950",
        active
          ? "border-zinc-950 bg-zinc-950 text-white shadow-xl"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">{plan.name}</h3>
          <p
            className={cn(
              "mt-1 text-xs leading-5",
              active ? "text-zinc-300" : "text-zinc-500",
            )}
          >
            {plan.audience ?? tier?.audience ?? plan.description}
          </p>
        </div>
        {active ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-950">
            Active
          </span>
        ) : plan.highlighted ? (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
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
                active ? "text-zinc-500" : "text-zinc-400",
              )}
            >
              {formatCurrency(plan.compareAtAmount)}
            </span>
            {promoSavingsPercent > 0 ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  active
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "bg-emerald-50 text-emerald-700",
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
            className={active ? "pb-1 text-sm text-zinc-300" : "pb-1 text-sm text-zinc-500"}
          >
            {plan.period}
          </span>
        </div>
      </div>

      <p className={active ? "mt-2 text-xs text-zinc-400" : "mt-2 text-xs text-zinc-500"}>
        {formatCurrency(monthlyDeviceEquivalent)}/bulan/device
        {!plan.compareAtAmount && savingsPercent > 0 ? ` · hemat ${savingsPercent}%` : ""}
      </p>

      {plan.compareAtAmount && savingsPercent > 0 ? (
        <p className={active ? "mt-1 text-xs text-zinc-400" : "mt-1 text-xs text-zinc-500"}>
          Hemat dari harga normal {formatCurrency(plan.compareAtAmount)}
        </p>
      ) : null}

      <p className={active ? "mt-5 text-sm leading-6 text-zinc-300" : "mt-5 text-sm leading-6 text-zinc-500"}>
        {plan.description}
      </p>

      <Link
        href={`/checkout?plan=${plan.id}`}
        onClick={(event) => event.stopPropagation()}
        className={buttonVariants({
          variant: active ? "secondary" : "default",
          size: "lg",
          className: "mt-6 w-full rounded-full",
        })}
      >
        {plan.cta}
        <ArrowRight className="size-4" />
      </Link>

      <div className={active ? "mt-6 border-t border-white/15 pt-6" : "mt-6 border-t border-zinc-200 pt-6"}>
        <div className={active ? "mb-3 text-xs font-medium text-zinc-300" : "mb-3 text-xs font-medium text-zinc-500"}>
          Termasuk
        </div>
        <div className="space-y-3">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm">
              <CheckCircle2
                className={active ? "mt-0.5 size-4 shrink-0 text-emerald-300" : "mt-0.5 size-4 shrink-0 text-emerald-600"}
              />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={active ? "mt-6 text-xs leading-5 text-zinc-300" : "mt-6 text-xs leading-5 text-zinc-500"}>
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
  const sameTierMonthly = monthlyPlans.find((item) => getTierId(item) === tierId);
  return sameTierMonthly ? getMonthlyEquivalent(sameTierMonthly) : null;
}

function getSavingsPercent(benchmark: number | null, currentAmount: number) {
  if (!benchmark || benchmark <= 0 || currentAmount >= benchmark) return 0;
  return Math.round((1 - currentAmount / benchmark) * 100);
}
