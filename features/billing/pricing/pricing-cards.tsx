"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { pricingPlans as fallbackPricingPlans, type PricingPlan, businessProfile } from "@/lib/constants/business";
import { cn, formatCurrency } from "@/lib/utils";

export function PricingCards({
  defaultPlanId = "yearly",
  plans = fallbackPricingPlans,
}: {
  defaultPlanId?: string;
  plans?: PricingPlan[];
}) {
  const [activePlanId, setActivePlanId] = useState(defaultPlanId);
  const visiblePlans = plans.length > 0 ? plans : fallbackPricingPlans;
  const monthlyPlan = visiblePlans.find((plan) => plan.durationMonths === 1);
  const monthlyBenchmark = monthlyPlan ? getMonthlyDevicePrice(monthlyPlan) : null;

  const standardPlans = visiblePlans.filter((plan) => plan.id !== "business");
  const businessPlan = visiblePlans.find((plan) => plan.id === "business");

  return (
    <div className="space-y-8">
      {/* 4 Standard Plans Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {standardPlans.map((plan) => {
          const active = activePlanId === plan.id;
          const monthlyDevicePrice = getMonthlyDevicePrice(plan);
          const savingsPercent =
            monthlyBenchmark && plan.durationMonths > 1
              ? Math.max(
                  0,
                  Math.round((1 - monthlyDevicePrice / monthlyBenchmark) * 100),
                )
              : 0;

          return (
            <article
              key={plan.id}
              role="button"
              tabIndex={0}
              onClick={() => setActivePlanId(plan.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActivePlanId(plan.id);
                }
              }}
              className={cn(
                "cursor-pointer rounded-lg border p-6 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950",
                active
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-xl"
                  : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {active ? (
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-zinc-950">
                    Active
                  </span>
                ) : plan.highlighted ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                    Best value
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                {plan.period && (
                  <span className={active ? "pb-1 text-sm text-zinc-300" : "pb-1 text-sm text-zinc-500"}>
                    {plan.period}
                  </span>
                )}
              </div>
              <p className={active ? "mt-2 text-xs text-zinc-400" : "mt-2 text-xs text-zinc-500"}>
                {formatCurrency(monthlyDevicePrice)}/bulan/device
                {savingsPercent > 0 ? ` · hemat ${savingsPercent}%` : ""}
              </p>
              <p className={active ? "mt-4 text-sm leading-6 text-zinc-300" : "mt-4 text-sm leading-6 text-zinc-500"}>
                {plan.description}
              </p>
              <Link
                href={`/checkout?plan=${plan.id}`}
                onClick={(event) => event.stopPropagation()}
                className={buttonVariants({
                  variant: active ? "secondary" : "default",
                  size: "lg",
                  className: "mt-6 w-full",
                })}
              >
                {plan.cta}
                <ArrowRight className="size-4" />
              </Link>
              <div className={active ? "mt-6 border-t border-white/15 pt-6" : "mt-6 border-t border-zinc-200 pt-6"}>
                <div className={active ? "mb-3 text-xs font-medium text-zinc-300" : "mb-3 text-xs font-medium text-zinc-500"}>
                  Included
                </div>
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={active ? "mt-0.5 size-4 text-emerald-300" : "mt-0.5 size-4 text-emerald-600"} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={active ? "mt-6 text-xs leading-5 text-zinc-300" : "mt-6 text-xs leading-5 text-zinc-500"}>
                Limits: {plan.limits.join(", ")}.
              </div>
            </article>
          );
        })}
      </div>

      {/* Full Width Business/Enterprise Plan */}
      {businessPlan && (
        <article
          role="button"
          tabIndex={0}
          onClick={() => setActivePlanId(businessPlan.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActivePlanId(businessPlan.id);
            }
          }}
          className={cn(
            "cursor-pointer rounded-2xl border p-8 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 mt-6",
            activePlanId === businessPlan.id
              ? "border-zinc-950 bg-zinc-950 text-white shadow-xl"
              : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50",
          )}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-[1.5fr_1fr] gap-8 items-center">
            {/* Left Section: Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                  Enterprise
                </span>
                {activePlanId === businessPlan.id && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-950 border border-zinc-200">
                    Active Selection
                  </span>
                )}
              </div>
              
              <h3 className="text-3xl font-bold tracking-tight">{businessPlan.name} Plan</h3>
              
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight">{businessPlan.price}</span>
                <span className={activePlanId === businessPlan.id ? "text-sm text-zinc-400" : "text-sm text-zinc-500"}>
                  Custom enterprise terms
                </span>
              </div>

              <p className={activePlanId === businessPlan.id ? "text-base leading-7 text-zinc-300 max-w-xl" : "text-base leading-7 text-zinc-600 max-w-xl"}>
                {businessPlan.description}
              </p>

              <div className="pt-2">
                <Link
                  href={`mailto:${businessProfile.salesEmail}?subject=POSKART Enterprise Subscription Request`}
                  onClick={(event) => event.stopPropagation()}
                  className={buttonVariants({
                    variant: activePlanId === businessPlan.id ? "secondary" : "default",
                    size: "lg",
                    className: "w-fit px-8",
                  })}
                >
                  Contact Sales
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </div>
            </div>

            {/* Right Section: Features list */}
            <div className={cn(
              "rounded-xl p-6 h-full flex flex-col justify-between",
              activePlanId === businessPlan.id ? "bg-white/5 border border-white/10" : "bg-zinc-50 border border-zinc-100"
            )}>
              <div>
                <div className={activePlanId === businessPlan.id ? "mb-4 text-sm font-semibold text-zinc-300 uppercase tracking-wider" : "mb-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider"}>
                  Included features & SLA
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {businessPlan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={activePlanId === businessPlan.id ? "mt-0.5 size-4 shrink-0 text-emerald-300" : "mt-0.5 size-4 shrink-0 text-emerald-600"} />
                      <span className={activePlanId === businessPlan.id ? "text-zinc-200" : "text-zinc-700"}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={cn(
                "mt-6 pt-4 border-t text-xs leading-5",
                activePlanId === businessPlan.id ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"
              )}>
                Limits: {businessPlan.limits.join(", ")}.
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

function getMonthlyDevicePrice(plan: PricingPlan) {
  const durationMonths = Math.max(1, plan.durationMonths);
  const includedDevices = Math.max(1, plan.includedDevices);

  return Math.round(plan.amount / durationMonths / includedDevices);
}
