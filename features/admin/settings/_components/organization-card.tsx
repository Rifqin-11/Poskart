"use client";

import Link from "next/link";
import { Building2, CreditCard, ShieldCheck, Store, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OrganizationCardProps = {
  isLoadingTenant: boolean;
  organizationName: string;
  planName: string;
  subscriptionActive: boolean;
  subscriptionStatus: string;
  deviceLimit: number;
  expiresAt: Date | null;
};

export function OrganizationCard({
  isLoadingTenant,
  organizationName,
  planName,
  subscriptionActive,
  subscriptionStatus,
  deviceLimit,
  expiresAt,
}: OrganizationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              Workspace, subscription, team, join code, and billing tetap
              dikelola di halaman organization.
            </CardDescription>
          </div>
          <Building2 className="size-5 text-zinc-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs text-zinc-500">Organization name</div>
          <div className="mt-1 text-base font-semibold text-zinc-950">
            {isLoadingTenant ? "Loading organization..." : organizationName}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <CreditCard className="mb-3 size-4 text-zinc-500" />
            <div className="text-xs text-zinc-500">Plan</div>
            <div className="mt-1 text-sm font-semibold text-zinc-950">
              {planName}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <ShieldCheck className="mb-3 size-4 text-zinc-500" />
            <div className="text-xs text-zinc-500">Status</div>
            <div className="mt-1 text-sm font-semibold capitalize text-zinc-950">
              {subscriptionActive ? "active" : subscriptionStatus}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <Store className="mb-3 size-4 text-zinc-500" />
            <div className="text-xs text-zinc-500">Device limit</div>
            <div className="mt-1 text-sm font-semibold text-zinc-950">
              {deviceLimit} device{deviceLimit > 1 ? "s" : ""}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <Timer className="mb-3 size-4 text-zinc-500" />
            <div className="text-xs text-zinc-500">Expiry</div>
            <div className="mt-1 text-sm font-semibold text-zinc-950">
              {expiresAt
                ? expiresAt.toLocaleDateString("id-ID")
                : "Not active"}
            </div>
          </div>
        </div>
        <Link
          href="/organization"
          className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Open Organization Settings
        </Link>
      </CardContent>
    </Card>
  );
}
