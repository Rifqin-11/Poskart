"use client";

import { Activity, AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react";
import { useState, type ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useSuperAdminProductUsage } from "@/features/admin/superadmin/use-superadmin";

const funnelSteps = [
  { key: "registered", label: "Registered" },
  { key: "trialStarted", label: "Trial started" },
  { key: "onboardingCompleted", label: "Onboarding completed" },
  { key: "devicePairingSuccess", label: "Device paired" },
  { key: "checkoutStarted", label: "Checkout started" },
  { key: "firstTransactionCreated", label: "First transaction" },
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProductUsageManagement() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useSuperAdminProductUsage(days);

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-zinc-500">
          Loading usage analytics…
        </CardContent>
      </Card>
    );
  }

  const funnel = data?.funnel;
  const maxFunnelValue = Math.max(funnel?.registered ?? 0, 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-zinc-950">
            <Activity className="size-5 text-[#00357B]" /> Usage Analytics
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Minimal first-party signals from registration through first transaction.
          </p>
        </div>
        <Select
          value={String(days)}
          onChange={(event) => setDays(Number(event.target.value))}
          className="w-full sm:w-40"
          aria-label="Usage analytics period"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 12 months</option>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Usage analytics could not be loaded. Apply the product usage migration first.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <UsageMetric
          label="Active organizations"
          value={funnel?.activeOrganizations ?? 0}
          description="Organizations that completed activation"
          icon={Activity}
        />
        <UsageMetric
          label="Device pairing success"
          value={funnel?.devicePairingSuccess ?? 0}
          description="Unique organizations that paired a device"
          icon={CheckCircle2}
        />
        <UsageMetric
          label="First transactions"
          value={funnel?.firstTransactionCreated ?? 0}
          description="Organizations reaching first operational sale"
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Activation funnel</CardTitle>
            <CardDescription>
              {data ? `${formatDate(data.range.from)} – ${formatDate(data.range.to)}` : "Selected period"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelSteps.map((step, index) => {
              const value = funnel?.[step.key] ?? 0;
              const previous = index === 0 ? value : funnel?.[funnelSteps[index - 1].key] ?? 0;
              const conversion = previous > 0 ? Math.round((value / previous) * 100) : 0;
              return (
                <div key={step.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-700">{step.label}</span>
                    <span className="tabular-nums text-zinc-950">
                      {value.toLocaleString("id-ID")}
                      {index > 0 ? (
                        <span className="ml-2 text-xs text-zinc-400">{conversion}% from previous</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-[#00357B] transition-all"
                      style={{ width: `${Math.max(2, (value / maxFunnelValue) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="pt-2 text-xs leading-5 text-zinc-400">
              Activation is counted when an organization pairs a device and creates its first transaction.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pairing failure reasons</CardTitle>
            <CardDescription>Normalized errors only; no device codes are stored.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.pairingErrors ?? []).length === 0 ? (
              <EmptyMessage text="No pairing failures recorded in this period." />
            ) : (
              data?.pairingErrors.map((item) => (
                <div key={item.errorCode} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    <span className="truncate font-mono text-xs text-zinc-700">{item.errorCode}</span>
                  </div>
                  <Badge variant="secondary">{item.attempts} attempts</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page usage</CardTitle>
          <CardDescription>Unique organizations and total page views.</CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.pageUsage ?? []).length === 0 ? (
            <EmptyMessage text="No page views recorded in this period." />
          ) : (
            <div className="divide-y divide-zinc-100">
              {data?.pageUsage.map((item) => (
                <div key={item.pagePath} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <code className="truncate text-zinc-700">{item.pagePath}</code>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                    <span>{item.uniqueOrganizations} orgs</span>
                    <span className="font-semibold text-zinc-950">{item.totalViews} views</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsageMetric({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#00357B]">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">{value.toLocaleString("id-ID")}</div>
          <div className="mt-1 text-xs text-zinc-500">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">{text}</div>;
}
