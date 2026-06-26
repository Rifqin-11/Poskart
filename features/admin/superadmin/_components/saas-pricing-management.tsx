"use client";

import { Info, Edit, Globe, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <Table>
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
