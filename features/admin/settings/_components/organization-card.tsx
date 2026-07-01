"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  ShieldCheck,
  Store,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SettingsInlineHeader,
  SettingsPanelBlock,
} from "./settings-card";

type OrganizationCardProps = {
  isLoadingTenant: boolean;
  organizationName: string;
  planName: string;
  subscriptionActive: boolean;
  subscriptionStatus: string;
  deviceLimit: number;
  expiresAt: Date | null;
};

function OrganizationMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-zinc-950">
        {value}
      </div>
    </div>
  );
}

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
    <div className="space-y-8">
      <section className="grid gap-5 border-b border-zinc-100 pb-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsInlineHeader
          icon={<Building2 className="size-4" />}
          title="Organization"
          description="Workspace, subscription, team, join code, dan billing tetap dikelola di halaman organization."
        />
        <SettingsPanelBlock>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                Workspace
              </div>
              <div className="mt-2 truncate text-2xl font-semibold text-zinc-950">
                {isLoadingTenant ? "Loading organization..." : organizationName}
              </div>
            </div>
            <Badge
              variant={subscriptionActive ? "default" : "secondary"}
              className="capitalize"
            >
              {subscriptionActive ? "active" : subscriptionStatus}
            </Badge>
          </div>
        </SettingsPanelBlock>
      </section>

      <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">Subscription</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Ringkasan plan, status, limit perangkat, dan tanggal expiry.
          </p>
        </div>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <OrganizationMetric
              icon={<CreditCard className="size-3.5" />}
              label="Plan"
              value={planName}
            />
            <OrganizationMetric
              icon={<ShieldCheck className="size-3.5" />}
              label="Status"
              value={
                <span className="capitalize">
                  {subscriptionActive ? "active" : subscriptionStatus}
                </span>
              }
            />
            <OrganizationMetric
              icon={<Store className="size-3.5" />}
              label="Device limit"
              value={`${deviceLimit} device${deviceLimit > 1 ? "s" : ""}`}
            />
            <OrganizationMetric
              icon={<Timer className="size-3.5" />}
              label="Expiry"
              value={
                expiresAt ? expiresAt.toLocaleDateString("id-ID") : "Not active"
              }
            />
          </div>
          <Link
            href="/organization"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50"
          >
            Open Organization Settings
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
