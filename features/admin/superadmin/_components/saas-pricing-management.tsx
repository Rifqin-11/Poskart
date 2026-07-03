"use client";

import { Info, Edit, Globe, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types/pricing";

type SaasPricingManagementProps = {
  subscriptionPlans: SubscriptionPlan[];
  onEditPlan: (plan: SubscriptionPlan) => void;
};

export function SaasPricingManagement({
  subscriptionPlans,
  onEditPlan,
}: SaasPricingManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SaaS Plan Tiers</CardTitle>
        <CardDescription>
          Subscription plans offered on POSKART signup. Super Admin can edit the
          base monthly rates and device limits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptionPlans.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
            No custom pricing plans configured in SaaS pricing.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white xl:block">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Plan name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Base price (IDR)</TableHead>
                  <TableHead>Included devices</TableHead>
                  <TableHead>Add. device price (monthly)</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-semibold text-zinc-900">
                      {plan.name}
                    </TableCell>
                    <TableCell>
                      {plan.durationMonths} month
                      {plan.durationMonths > 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>{formatCurrency(plan.basePrice)}</TableCell>
                    <TableCell>
                      {plan.includedDevices} device
                      {plan.includedDevices > 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(plan.additionalDevicePriceMonthly)}
                    </TableCell>
                    <TableCell>
                      {plan.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <Globe className="size-3" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                          <EyeOff className="size-3" />
                          Private
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onEditPlan(plan)}
                      >
                        <Edit className="size-3.5" />
                        <span className="sr-only">Edit plan</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            <div className="grid gap-3 xl:hidden">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-950">
                        {plan.name}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {plan.durationMonths} month
                        {plan.durationMonths > 1 ? "s" : ""} ·{" "}
                        {plan.includedDevices} device
                        {plan.includedDevices > 1 ? "s" : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onEditPlan(plan)}
                    >
                      <Edit className="size-3.5" />
                      <span className="sr-only">Edit plan</span>
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <PricingInfo
                      label="Base price"
                      value={formatCurrency(plan.basePrice)}
                    />
                    <PricingInfo
                      label="Additional device"
                      value={formatCurrency(plan.additionalDevicePriceMonthly)}
                    />
                  </div>
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    {plan.isPublic ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <Globe className="size-3" />
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                        <EyeOff className="size-3" />
                        Private
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
          <Info className="size-4 shrink-0" />
          <div>
            Billing updates: Customers are billed in cycles depending on their
            selected plan duration. Editing these configurations only affects
            new subscription purchases or manual renewals; active subscriptions will
            retain their original pricing terms.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PricingInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  );
}
