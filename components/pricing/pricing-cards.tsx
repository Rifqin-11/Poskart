"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { pricingPlans as fallbackPricingPlans, type PricingPlan } from "@/lib/constants/business";
import { cn } from "@/lib/utils";

export function PricingCards({
  defaultPlanId = "yearly",
  plans = fallbackPricingPlans,
}: {
  defaultPlanId?: string;
  plans?: PricingPlan[];
}) {
  const [activePlanId, setActivePlanId] = useState(defaultPlanId);
  const visiblePlans = plans.length > 0 ? plans : fallbackPricingPlans;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {visiblePlans.map((plan) => {
        const active = activePlanId === plan.id;

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
              <span className={active ? "pb-1 text-sm text-zinc-300" : "pb-1 text-sm text-zinc-500"}>
                {plan.period}
              </span>
            </div>
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
  );
}
